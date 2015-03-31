/*global  JSZip*/
'use strict';
var zipFileNameEl = document.querySelector('#zipFileName');
var zipFileListEl = document.querySelector('#zipFileList');
var uploadBtnEl = document.querySelector('#uploadBtn');
var fileInputEl = document.querySelector('#zipfile');
var msgBoxEl = document.querySelector('#msgBox');
var prjectNameEl = document.querySelector('#projectName');

var badCharsRegex = /[^a-zA-Z\d\-\_\+]/g;

var messages = {
    wrongType: 'You can only upload .zip files',
    missingIndexFile: 'WARNING: No index.html file found in ZIP file',
    indexFileNotInRoot: 'WARNING: index.html needs to be in base folder, not ' +
                        'a sub-folder'
};

function showMsg(msg) {
    msgBoxEl.classList.add('active');
    msgBoxEl.innerHTML = msg;
}

function hideMsg() {
    msgBoxEl.classList.remove('active');
    msgBoxEl.innerHTML = '';
}

function checkForIndexFile(filePaths) {
    var hasIndexFile = filePaths.some(function(filePath) { 
        return filePath.indexOf('index.html') !== -1;
    });
    if (!hasIndexFile) {
        showMsg(messages.missingIndexFile);
    }
}

function checkForRootIndexFile(filePaths) {
    var hasIndexFileInRoot = filePaths.some(function(filePath) { 
        return filePath === 'index.html';
    });
    if (!hasIndexFileInRoot) {
        showMsg(messages.indexFileNotInRoot);
    }
}

function listZipContents(zipFileName, filePaths) {
    console.log(zipFileName, filePaths);
    zipFileNameEl.innerHTML = zipFileName;

    zipFileListEl.innerHTML = '';
    filePaths.forEach(function(filePath) {
        var li = document.createElement('li');
        li.innerHTML = filePath;
        zipFileListEl.appendChild(li);
    });
}

function setProjectName(zipFileName) {

    var projectName = zipFileName.trim();
    var extRegex = /\.zip/gi;
    projectName = projectName.replace(/\W+/, '-');
    projectName = projectName.replace(extRegex, '');
    projectName = projectName.replace(badCharsRegex, '');
    prjectNameEl.value = projectName;
}

function readZipFile(zipFile) {
    return function(evt) {
        var zip = new JSZip(evt.target.result);
        var filePaths = Object.keys(zip.files);

        checkForRootIndexFile(filePaths);
        checkForIndexFile(filePaths);
        setProjectName(zipFile.name);
        listZipContents(zipFile.name, filePaths);
    };
}

function checkFile() {
    if (fileInputEl.files.length === 0) {
       uploadBtnEl.setAttribute('disabled', 'disabled');
       return;
    }

    var isZipFile = (fileInputEl.files[0].type === 'application/zip');
    if (!isZipFile) {
        uploadBtnEl.setAttribute('disabled', 'disabled');
        showMsg(messages.wrongType);
        return;
    }

    var zipFile = fileInputEl.files[0];
    var reader = new FileReader();
    reader.onload = readZipFile(zipFile);
    reader.readAsArrayBuffer(zipFile);

    uploadBtnEl.removeAttribute('disabled');
    hideMsg();
}

fileInputEl.addEventListener('change', checkFile, false);
fileInputEl.value = null;
