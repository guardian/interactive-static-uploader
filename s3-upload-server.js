'use strict';
var https = require('https');
var express = require('express');
var multer = require('multer');
var morgan = require('morgan');
var moment = require('moment');
var extract = require('extract-zip');
var querystring = require('querystring');
var engines = require('consolidate');
var tmp = require('tmp');
var fs = require('fs');
var recursive = require('recursive-readdir');
var s3 = require('s3');
var awsConfig = require('./aws-config.json');

var s3Client = s3.createClient({
    multipartUploadThreshold: 20971520, // this is the default (20 MB)
    multipartUploadSize: 15728640, // this is the default (15 MB)
    s3Options: {
        accessKeyId: awsConfig.accessKeyId,
        secretAccessKey: awsConfig.secretAccessKey,
    }
});

// Web server
var app = express();
app.use(express.static(__dirname + '/public'));
app.use(express.static(__dirname + '/bower_components'));
app.engine('html', engines.mustache);
app.set('view engine', 'html');
app.use(morgan('dev'));
app.use(multer({
    limits : { fileSize: 100000000 }, // 100MB
    putSingleFilesInArray: true
}));

var messeges = {
    noFile: 'No .zip file was selected.',
    wrongFileType: 'Only .zip files are allowed.'
};

// Routes
app.get('/', function(req, res){
  res.render('base', { partials: { body: 'partials/uploadForm' } });
})
.get('/upload', function(req, res){
    res.redirect('/');
})
.post('/upload', function(req, res) {
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
        if (err) {
            return console.log(err);
        }

        var filePaths = [];
        recursive(tmpobj.name, function(err, files) {
            if (err) { return console.log('ERROR', err); }
            filePaths = files.map(function(file) {
                return file.replace(tmpobj.name, '');
            });
        });

        // Delete zip
        fs.unlink(zipPath);

        var projectName = 'visual';
        if (req.body.projectName && req.body.projectName.length > 1) {
            projectName = req.body.projectName.toLowerCase();
            projectName = projectName.trim();
            projectName = projectName.replace(' ', '-');

            var badCharsRegex = /[^a-zA-Z\d\-\_\+]/g;
            projectName = projectName.replace(badCharsRegex, '');
        }

        var uploadPath = awsConfig.folderPath;
        uploadPath += moment().format('YYYY/MM');
        uploadPath += '/' + projectName;
        uploadPath += tmpobj.name.substr(tmpobj.name.lastIndexOf('/'));

        // Set upload parameters
        var uploadParams = {
            localDir: tmpobj.name,
            s3Params: {
                Bucket: awsConfig.bucketName,
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
        uploader.on('progress', function() {
            // console.log('progress', uploader.progressAmount, uploader.progressTotal);
        });
        uploader.on('end', function() {
            tmpobj.removeCallback();

            // Logo upload to file
            var logInfo = [
                new Date().toISOString(),
                file.originalname,
                awsConfig.baseURL + uploadPath 
            ];
            fs.appendFileSync('public/upload.log', logInfo.join(',') + '\n');
            
            var successData = {
                files: filePaths,
                zipFileName: file.originalname,
                embedPath: awsConfig.baseURL + uploadPath
            };
            res.redirect('/success?' + querystring.stringify(successData));
        });
    });
})
.get('/error', function(req, res) {
    req.query.partials = { body: 'partials/error'};
    res.render('base', req.query);
})
.get('/success', function(req, res) { 
    req.query.partials = { body: 'partials/success'};
    res.render('base', req.query);
});

// TLS server
var privateKey  = fs.readFileSync('sslcert/server.key', 'utf8');
var certificate = fs.readFileSync('sslcert/server.crt', 'utf8');
var credentials = {key: privateKey, cert: certificate};
https.createServer(credentials, app).listen(3000);
