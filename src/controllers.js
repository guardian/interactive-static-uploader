'use strict';
var moment = require('moment');
var denodeify = require('denodeify')
var extract = denodeify(require('extract-zip'));
var querystring = require('querystring');
// var Mustache = require('mustache');
var cons = require('consolidate')
var tmp = require('tmp');
var fs = require('fs');
var path = require('path');
var rmdir = require('rimraf');
var recursive = denodeify(require('recursive-readdir'));
var s3 = require('s3');
var gu = require('koa-gu');
var parse = require('co-busboy');
var os = require('os');

var baseTemplate = path.resolve(__dirname, 'templates/base.html')

var s3Client = s3.createClient({
    multipartUploadThreshold: 20971520, // this is the default (20 MB)
    multipartUploadSize: 15728640,      // this is the default (15 MB)
    s3Options: {
        accessKeyId: gu.config.accessKeyId,
        secretAccessKey: gu.config.secretAccessKey,
    }
});

// Message strings
var messages = {
    noFile: 'No .zip file was selected.',
    wrongFileType: 'Only .zip files are allowed.'
};

// Routes
exports.index = function*() {
    this.body = yield cons.mustache(baseTemplate, {partials: { body: 'partials/uploadForm' }});
}

exports.upload = function*() {

    var zipfile = this.request.body.files.zipfile;

    if (!zipfile || !zipfile.size) {
        return this.redirect(`error?msg=${messages.noFile}`);
    }

    if (zipfile.type !== 'application/zip') {
        return this.redirect(`error?msg=${messages.wrongFileType}`);
    }

    var tmpobj = tmp.dirSync({ prefix: 'giv-', unsafeCleanup: true });
    var fields = this.request.body.fields;

    // extract and delete archive
    yield extract(zipfile.path, {dir: tmpobj.name})
    fs.unlinkSync(zipfile.path);

    rmdir(path.join(tmpobj.name, '__MACOSX'), err => gu.log.error(err) );

    var files = yield recursive(tmpobj.name);

    var filePaths = files.map( file =>  file.replace(tmpobj.name, '') );

    var projectName = !fields.projectName || fields.projectName.length < 2 ? 'visual' :
        fields.projectName
            .toLowerCase().trim().replace(' ', '-')
            .replace(/[^a-zA-Z\d\-\_\+]/g, ''); // enforce character whitelist

    var uploadPath = path.join(
        gu.config.folderPath,
        moment().format('YYYY/MM'),
        projectName,
        tmpobj.name.substr(tmpobj.name.lastIndexOf('/'))
    );

    var s3UploadDir = params =>
        new Promise((resolve, reject) => {
            var uploader = s3Client.uploadDir(params);
            uploader.on('error', reject);
            uploader.on('end', resolve);
        })

    try {
        yield s3UploadDir({
            localDir: tmpobj.name,
            s3Params: {
                Bucket: gu.config.bucketName,
                Prefix: uploadPath,
                ACL: 'public-read',
                CacheControl: 'max-age=604800' // week
            }
        })
        var uri = gu.config.baseURL + uploadPath;
        gu.log.info(`${zipfile.name} -> ${uri}`)
        this.redirect('success?' + querystring.stringify({
            files: filePaths,
            zipFileName: zipfile.name,
            embedPath: uri
        }));
    } catch (err) {
        this.redirect('error?msg=' + querystring.stringify(err.message));
        tmpobj.removeCallback();
        gu.log.error('unable to sync:', err.stack);
    }
}

exports.error = function*() {
    var ctx = {
        error: querystring.parse(this.request.querystring).msg,
        partials: { body: 'partials/error'}
    }
    this.body = yield cons.mustache(baseTemplate, ctx);
}

exports.success = function*() {
    var ctx = querystring.parse(this.request.querystring);
    ctx.partials = { body: 'partials/success'};
    this.body = yield cons.mustache(baseTemplate, ctx);
}
