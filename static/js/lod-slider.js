/**
 * LoD comparison slider: side-by-side Fourier vs Octree-GS at varying levels.
 * Supports scene switching (truck/train) and auto-play animation.
 */
document.addEventListener('DOMContentLoaded', function () {
    var slider = document.getElementById('lod-slider');
    var display = document.getElementById('lod-level-display');
    var octreeImg = document.getElementById('lod-octree-img');
    var fourierImg = document.getElementById('lod-fourier-img');
    var autoBtn = document.getElementById('lod-autoplay');
    var sceneSelector = document.getElementById('lod-scene-selector');

    if (!slider || !octreeImg || !fourierImg) return;

    var currentScene = 'truck';
    var autoInterval = null;
    var autoDirection = 1;

    function updateImages() {
        var lod = slider.value;
        display.textContent = lod;
        octreeImg.src = 'static/images/scaling/' + currentScene + '_octree_lod' + lod + '.png';
        fourierImg.src = 'static/images/scaling/' + currentScene + '_fourier_lod' + lod + '.png';
    }

    slider.addEventListener('input', updateImages);

    // Scene selector
    if (sceneSelector) {
        sceneSelector.querySelectorAll('button').forEach(function (btn) {
            btn.addEventListener('click', function () {
                sceneSelector.querySelectorAll('button').forEach(function (b) {
                    b.classList.remove('active');
                });
                btn.classList.add('active');
                currentScene = btn.getAttribute('data-scene');
                updateImages();
            });
        });
    }

    // Auto-play: sweep LoD 1→6→1→6... slowly
    if (autoBtn) {
        autoBtn.addEventListener('click', function () {
            if (autoInterval) {
                clearInterval(autoInterval);
                autoInterval = null;
                autoBtn.innerHTML = '<i class="fas fa-play"></i> Auto-play';
                return;
            }

            autoBtn.innerHTML = '<i class="fas fa-pause"></i> Pause';
            autoDirection = 1;

            autoInterval = setInterval(function () {
                var val = parseInt(slider.value) + autoDirection;
                if (val > 6) { val = 5; autoDirection = -1; }
                if (val < 1) { val = 2; autoDirection = 1; }
                slider.value = val;
                updateImages();
            }, 800);
        });
    }
});