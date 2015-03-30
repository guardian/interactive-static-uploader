'use strict';

var express = require('express');
var multer = require('multer');
var morgan = require('morgan');
var extract = require('extract-zip');
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
    // dest: './tmp/',
    limits : { fileSize: 100000000 }, // 100MB
    putSingleFilesInArray: true
}));

// Routes
app.get('/', function(req, res){
  res.render('base', { partials: { body: 'partials/uploadForm' } });
})
.get('/upload', function(req, res){
    res.redirect('/');
})
.post('/upload', function(req, res) {
    if (req.files.zipfile === undefined ||
        req.files.zipfile[0] === undefined) {
        return res.render('base', {
            error: 'No .zip file was selected.',
            partials: { body: 'partials/error' }
        });
    }

    var file = req.files.zipfile[0];
    if (file.extension.toLowerCase() !== 'zip') {
        return res.render('base', {
            error: 'Only .zip files are allowed.',
            partials: { body: 'partials/error' }
        });
    }

    var tmpobj = tmp.dirSync({ prefix: 'giv-', unsafeCleanup: true });
    var zipPath = file.path;

    extract(zipPath, {dir: tmpobj.name}, function(err) {
        if (err) {
            return console.log(err);
        }

        var filePaths = [];
        recursive(tmpobj.name, function(err, files) {
            if (err) {
                return console.log('ERROR', err);
            }
            filePaths = files.map(function(file) {
                return file.replace(tmpobj.name, '');
            });
        });

        // Delete zip
        fs.unlink(zipPath);

        var uploadPath = 'uploader';
        uploadPath += tmpobj.name.substr(tmpobj.name.lastIndexOf('/'));
        uploadPath += '-' + Date.now();

        // Set upload parameters
        var params = {
            localDir: tmpobj.name,
            s3Params: {
                Bucket: 'gdn-testing',
                Prefix: uploadPath,
                ACL: 'public-read',
                CacheControl: 'max-age=57'
            }
        };

        // Sync folder
        var uploader = s3Client.uploadDir(params);
        uploader.on('error', function(err) {
            console.error('unable to sync:', err.stack);
            tmpobj.removeCallback();
        });
        uploader.on('progress', function() {
            console.log('progress',
            uploader.progressAmount, uploader.progressTotal);
        });
        uploader.on('end', function() {
            console.log('done uploading');
            tmpobj.removeCallback();

            var embedPath = awsConfig.baseURL + uploadPath;
            return res.render('base', {
                files: filePaths,
                zipFileName: file.originalname,
                embedPath: embedPath,
                partials: { body: 'partials/success' }
            });
        });
    });

})
.get('/finished', function(req, res){
  res.send('DONE');
});


// Start the app
app.listen(3000);
