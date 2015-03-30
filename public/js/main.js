/*global  */
'use strict';

console.log('Loaded.');

var uploadBtn = document.querySelector('#uploadBtn');
var fileInput = document.querySelector('#zipfile');
var msgBox = document.querySelector('#msgBox');

var messages = {
    wrongType: 'You can only upload .zip files'
};


function isZipFile() {
    return (fileInput.files[0].type === 'application/zip');
}

function showMsg(msg) {
    msgBox.classList.add('active');
    msgBox.innerHTML = msg;
}

function hideMsg() {
    msgBox.classList.remove('active');
    msgBox.innerHTML = '';
}


function checkFile() {
    if (fileInput.files.length === 0) {
       uploadBtn.setAttribute('disabled', 'disabled');
       return;
    }

    if (isZipFile() === false) {
        uploadBtn.setAttribute('disabled', 'disabled');
        showMsg(messages.wrongType);
        return;
    }

    uploadBtn.removeAttribute('disabled');
    hideMsg();
}

fileInput.addEventListener('change', checkFile, false);
fileInput.value = null;
