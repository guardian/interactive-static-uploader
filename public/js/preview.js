/*global  JSZip*/
var aLinks = document.querySelectorAll('.embedPreview');
[].forEach.call(aLinks, function(aLink) {
    addIframe(aLink);
});