'use strict';
var passport = require('passport');
var GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;
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

app.use(passport.initialize());
app.use(passport.session());

// Setup auth
var HOSTED_DOMAIN = 'guardian.co.uk';
var GOOGLE_SCOPE = 'https://www.googleapis.com/auth/plus.login';

passport.serializeUser(function(user, done) {
    done(null, user);
});
passport.deserializeUser(function(obj, done) {
  done(null, obj);
});
passport.use(new GoogleStrategy({
        clientID: config.googleClientID,
        clientSecret: config.googleClientSecret,
        callbackURL: config.googleCallbackURL
    },
    function(accessToken, refreshToken, profile, done) {

        process.nextTick(function () {
            return done(null, profile);
        });

  })
);

function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) { return next(); }
    res.redirect('/auth/google');
}

// Routes
app.get('/', ensureAuthenticated, function(req, res){
    res.render('base', {
        user: req.user,
        partials: { body: 'partials/uploadForm' }
    });
});

app.get('/upload', ensureAuthenticated, function(req, res){
    res.redirect('/');
});

app.post('/upload', ensureAuthenticated, function(req, res) {
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

        // Delete zip
        fs.unlink(zipPath);

        // Remove MAC __MACOSX zip folder
        rmdir(tmpobj.name + '/__MACOSX', function(err){ console.log(err); });
        
        recursive(tmpobj.name, function(err, files) {
            if (err) { return console.log('ERROR', err); }
            var filePaths = files.map(function(file) {
                return file.replace(tmpobj.name, '');
            });

            var projectName = 'visual';
            if (req.body.projectName && req.body.projectName.length > 1) {
                projectName = req.body.projectName.toLowerCase();
                projectName = projectName.trim();
                projectName = projectName.replace(' ', '-');

                var badCharsRegex = /[^a-zA-Z\d\-\_\+]/g;
                projectName = projectName.replace(badCharsRegex, '');
            }

            var uploadPath = config.folderPath;
            uploadPath += moment().format('YYYY/MM');
            uploadPath += '/' + projectName;
            uploadPath += tmpobj.name.substr(tmpobj.name.lastIndexOf('/'));

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
                // Logo upload to file
                var logInfo = [
                    new Date().toISOString(),
                    file.originalname,
                    config.baseURL + uploadPath 
                ];
                fs.appendFileSync('public/upload.log', logInfo.join(',') + '\n');
                
                var successData = {
                    files: filePaths,
                    zipFileName: file.originalname,
                    embedPath: config.baseURL + uploadPath
                };

                res.redirect('/success?' + querystring.stringify(successData));
            });

         });
    });
});

app.get('/error', ensureAuthenticated, function(req, res) {
    req.query.partials = { body: 'partials/error'};
    req.query.user = req.user;
    res.render('base', req.query);
});

app.get('/success', ensureAuthenticated, function(req, res) { 
    req.query.partials = { body: 'partials/success'};
    req.query.user = req.user;
    res.render('base', req.query);
});

app.get('/logout', function(req, res){
    req.logout();
    res.redirect('/');
});

app.get('/auth/google',
    passport.authenticate('google', {
        'scope': GOOGLE_SCOPE,
        'hostedDomain': HOSTED_DOMAIN,
        'failureRedirect': '/auth/google',
        'max_auth_age': 604800 // one week
    })
);

app.get('/auth/google/callback', 
    passport.authenticate('google', {
        'scope': GOOGLE_SCOPE,
        'hostedDomain': HOSTED_DOMAIN,
        'failureRedirect': '/auth/google',
        'max_auth_age': 604800 // one week
    }),
  function(req, res) {
    res.redirect('/');
  });

app.get('/logout', function(req, res){
    req.logout();
    res.redirect('/');
});


// TLS server
// var privateKey  = fs.readFileSync('sslcert/server.key', 'utf8');
// var certificate = fs.readFileSync('sslcert/server.crt', 'utf8');
// var credentials = {key: privateKey, cert: certificate};
// https.createServer(credentials, app).listen(3000);
app.listen(3000);
