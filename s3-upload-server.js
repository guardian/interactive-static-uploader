'use strict';
var express = require('express');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var session = require('express-session');
var multer = require('multer');
var morgan = require('morgan');
var moment = require('moment');
var extract = require('extract-zip');
var querystring = require('querystring');
var engines = require('consolidate');
var tmp = require('tmp');
var fs = require('fs');
var path = require('path');
var rmdir = require('rimraf');
var recursive = require('recursive-readdir');
var s3 = require('s3');
var config = require('./config.json');

var s3Client = s3.createClient({
    multipartUploadThreshold: 20971520, // this is the default (20 MB)
    multipartUploadSize: 15728640,      // this is the default (15 MB)
    s3Options: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
    }
});

// Message strings
var messeges = {
    noFile: 'No .zip file was selected.',
    wrongFileType: 'Only .zip files are allowed.'
};

// Web server
var app = express();
app.use(express.static(__dirname + '/public'));
app.use(express.static(__dirname + '/bower_components'));
app.engine('html', engines.mustache);
app.set('view engine', 'html');
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(morgan('dev'));
app.use(multer({
    limits : { fileSize: 100000000 }, // 100MB
    putSingleFilesInArray: true
}));

app.use(session({
    secret: config.sessionSecret,
    resave: false,
    saveUninitialized: true
}));

// Routes
app.get('/', function(req, res){
    res.render('base', {
        user: req.user,
        partials: { body: 'partials/uploadForm' }
    });
});

app.get('/upload', function(req, res){
    res.redirect('/');
});

app.post('/upload', function(req, res) {
    var isFileUploaded = (req.files.zipfile && req.files.zipfile.length > 0);
    if (!isFileUploaded) {
        return res.redirect('/error?msg=' + messeges.noFile);
    }

    var file = req.files.zipfile[0];
    if (file.mimetype !== 'application/zip') {
        return res.redirect('/error?msg=' + messeges.wrongFileType);
    }

    var tmpobj = tmp.dirSync({ prefix: 'giv-', unsafeCleanup: true });
    var zipPath = file.path;

    extract(zipPath, {dir: tmpobj.name}, function(err) {
        if (err) return console.error(err);

        // Delete zip
        fs.unlink(zipPath);

        // Remove MAC __MACOSX zip folder
        rmdir(path.join(tmpobj.name, '__MACOSX'), function(err){ console.log(err); });

        recursive(tmpobj.name, function(err, files) {
            if (err) return console.log('ERROR', err);

            var filePaths = files.map(function(file) {
                return file.replace(tmpobj.name, '');
            });

            var projectName = !req.body.projectName || req.body.projectName.length < 2 ? 'visual' :
                req.body.projectName
                    .toLowerCase().trim().replace(' ', '-')
                    .replace(/[^a-zA-Z\d\-\_\+]/g, ''); // enforce character whitelist

            var uploadPath = path.join(
                config.folderPath,
                moment().format('YYYY/MM'),
                projectName,
                tmpobj.name.substr(tmpobj.name.lastIndexOf('/'))
            );

            // Set upload parameters
            var uploadParams = {
                localDir: tmpobj.name,
                s3Params: {
                    Bucket: config.bucketName,
                    Prefix: uploadPath,
                    ACL: 'public-read',
                    CacheControl: 'max-age=604800' // week
                }
            };

            // Sync folder
            var uploader = s3Client.uploadDir(uploadParams);
            uploader.on('error', function(err) {
                console.error('unable to sync:', err.stack);
                tmpobj.removeCallback();
                res.redirect('/error?msg=' + querystring.stringify(err));
            });
            uploader.on('end', function() {
                var uri = path.join(config.baseURL, uploadPath);
                // Logo upload to file
                var logInfo = [
                    new Date().toISOString(),
                    file.originalname,
                    uri
                ];
                fs.appendFileSync('public/upload.log',
                                  logInfo.join(',') + '\n');

                var successData = {
                    files: filePaths,
                    zipFileName: file.originalname,
                    embedPath: uri
                };

                res.redirect('/success?' + querystring.stringify(successData));
            });

         });
    });
});

app.get('/error', function(req, res) {
    req.query.partials = { body: 'partials/error'};
    req.query.user = req.user;
    res.render('base', req.query);
});

app.get('/success', function(req, res) {
    req.query.partials = { body: 'partials/success'};
    req.query.user = req.user;
    res.render('base', req.query);
});

app.listen(3000);
