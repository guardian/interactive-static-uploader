/*global  JSZip*/
'use strict';
var zipFileNameEl = document.querySelector('#zipFileName');
var zipFileListEl = document.querySelector('#zipFileList');
var uploadBtnEl = document.querySelector('#uploadBtn');
var fileInputEl = document.querySelector('#zipfile');
var msgBoxEl = document.querySelector('#msgBox');
var prjectNameEl = document.querySelector('#projectName');
var projectDateEl = document.querySelector('.projectDate');
var prjectNamePreviewEl = document.querySelector('.projectNamePreview');
var step1El = document.querySelector('#step1');
var step1NumEl = document.querySelector('.step1');
var step2El = document.querySelector('#step2');
var stepNumEls = document.querySelectorAll('.step');

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
    zipFileNameEl.innerHTML = zipFileName;

    zipFileListEl.innerHTML = '';
    filePaths.forEach(function(filePath) {
        var li = document.createElement('li');
        li.innerHTML = filePath;
        zipFileListEl.appendChild(li);
    });
}

function cleanProjectName(projectName) {
    var tmpName = projectName.trim();
    var extRegex = /\.zip/gi;
    tmpName = tmpName.replace(/\W+/g, '-');
    tmpName = tmpName.replace(extRegex, '');
    tmpName = tmpName.replace(badCharsRegex, '');
    return  tmpName;
}

function setProjectName(zipFileName) {
    var projectName = cleanProjectName(zipFileName);
    prjectNameEl.value = projectName;
    prjectNamePreviewEl.innerHTML = projectName;
    projectDateEl.innerHTML = moment().format('YYYY/MM');
}

function readZipFile(zipFile) {
    return function(evt) {
        var zip = new JSZip(evt.target.result);
        var filePaths = Object.keys(zip.files);
        // Filter out Mac's zip guff
        filePaths = filePaths.filter(function(file) {
            return file.indexOf('__MACOSX') !== 0;
        });

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

    step1El.style.display = 'none';
    step2El.style.display = 'block';
    [].forEach.call(stepNumEls, function(el , i) {
        if (i === 1) { el.classList.toggle('disabled', false); }
        else { el.classList.toggle('disabled', true); }
    });

    var zipFile = fileInputEl.files[0];
    var reader = new FileReader();
    reader.onload = readZipFile(zipFile);
    reader.readAsArrayBuffer(zipFile);

    uploadBtnEl.removeAttribute('disabled');
    hideMsg();
}

fileInputEl.addEventListener('change', checkFile, false);
fileInputEl.value = null;

function goToStepOne() {
    hideMsg();
    fileInputEl.value = null;
    step1El.style.display = 'block';
    step2El.style.display = 'none';
    [].forEach.call(stepNumEls, function(el , i) {
        if (i === 0) { el.classList.toggle('disabled', false); }
        else { el.classList.toggle('disabled', true); }
    });
}

step1NumEl.addEventListener('click', goToStepOne, false);


function updateURLPreview(evt) {
    var tmpName = cleanProjectName(evt.currentTarget.value) || 'default';
    prjectNamePreviewEl.innerHTML = tmpName;
}

prjectNameEl.addEventListener('change', updateURLPreview, false);
prjectNameEl.addEventListener('keyup', updateURLPreview, false);

// Commissioning desks dropdown. Selected desks are kept in `selectedDesks`
// and mirrored into a hidden, pipe-separated input field so they're
// submitted along with the rest of the form.
var desksSearchEl = document.querySelector('#commissioningDesksSearch');
var desksResultsEl = document.querySelector('#commissioningDesksResults');
var desksSelectedEl = document.querySelector('#commissioningDesksSelected');
var desksValueEl = document.querySelector('#commissioningDesksValue');

var selectedDesks = [];
var desksSearchDebounce = null;

function renderSelectedDesks() {
    desksSelectedEl.innerHTML = '';
    selectedDesks.forEach(function(desk) {
        var li = document.createElement('li');
        li.className = 'desk-chip';
        li.innerHTML = desk.name +
            ' <button type="button" class="desk-chip-remove" ' +
            'data-id="' + desk.id + '">&times;</button>';
        desksSelectedEl.appendChild(li);
    });
    desksValueEl.value = selectedDesks.map(function(desk) {
        return desk.id;
    }).join('|');
}

function addDesk(desk) {
    var alreadySelected = selectedDesks.some(function(existing) {
        return existing.id === desk.id;
    });

    if (!alreadySelected) {
        selectedDesks.push(desk);
        renderSelectedDesks();
    }

    desksResultsEl.innerHTML = '';
    desksSearchEl.value = '';
}

function removeDesk(id) {
    selectedDesks = selectedDesks.filter(function(desk) {
        return desk.id !== id;
    });
    renderSelectedDesks();
}

function renderDeskResults(desks) {
    desksResultsEl.innerHTML = '';
    desks.forEach(function(desk) {
        var li = document.createElement('li');
        li.textContent = desk.name;
        li.addEventListener('click', function() { addDesk(desk); });
        desksResultsEl.appendChild(li);
    });
}

function searchCommissioningDesks(query) {
    if (!query) {
        desksResultsEl.innerHTML = '';
        return;
    }

    fetch('commissioningdesks?query=' + encodeURIComponent(query))
        .then(function(res) { return res.json(); })
        .then(function(json) { renderDeskResults(json.desks || []); })
        .catch(function() { desksResultsEl.innerHTML = ''; });
}

if (desksSearchEl) {
    desksSearchEl.addEventListener('input', function(evt) {
        var query = evt.target.value;
        clearTimeout(desksSearchDebounce);
        desksSearchDebounce = setTimeout(function() {
            searchCommissioningDesks(query);
        }, 300);
    });

    desksSelectedEl.addEventListener('click', function(evt) {
        if (evt.target.classList.contains('desk-chip-remove')) {
            removeDesk(evt.target.getAttribute('data-id'));
        }
    });
}
