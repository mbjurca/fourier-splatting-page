/**
 * 4-way image comparison slider.
 * Divides an image into 4 vertical strips, each showing a different method.
 * 3 draggable handles let the user resize strips.
 * All images stay perfectly aligned — only the clip boundaries move.
 */
document.addEventListener('DOMContentLoaded', function () {

    document.querySelectorAll('.quad-compare').forEach(function (container) {
        var layers = container.querySelectorAll('.qc-layer');
        var handles = container.querySelectorAll('.qc-handle');
        if (layers.length < 4 || handles.length < 3) return;

        // Initial positions at 25%, 50%, 75%
        var splits = [25, 50, 75];
        var activeHandle = -1;
        var MIN_GAP = 4; // minimum % between handles

        function applyClips() {
            var bounds = [0, splits[0], splits[1], splits[2], 100];
            for (var i = 0; i < 4; i++) {
                var left = bounds[i];
                var right = bounds[i + 1];
                layers[i].style.clipPath =
                    'inset(0 ' + (100 - right) + '% 0 ' + left + '%)';
            }
            for (var j = 0; j < 3; j++) {
                handles[j].style.left = splits[j] + '%';
            }
        }

        function getPos(clientX) {
            var rect = container.getBoundingClientRect();
            return Math.max(0, Math.min(((clientX - rect.left) / rect.width) * 100, 100));
        }

        function clampSplits() {
            // Enforce ordering with minimum gap
            splits[0] = Math.max(MIN_GAP, Math.min(splits[0], 100 - 3 * MIN_GAP));
            splits[1] = Math.max(splits[0] + MIN_GAP, Math.min(splits[1], 100 - 2 * MIN_GAP));
            splits[2] = Math.max(splits[1] + MIN_GAP, Math.min(splits[2], 100 - MIN_GAP));
        }

        // Mouse events
        handles.forEach(function (h, idx) {
            h.addEventListener('mousedown', function (e) {
                e.preventDefault();
                e.stopPropagation();
                activeHandle = idx;
            });
        });

        // Also allow clicking anywhere on the container to move nearest handle
        container.addEventListener('mousedown', function (e) {
            if (activeHandle >= 0) return;
            var pct = getPos(e.clientX);
            // Find nearest handle
            var best = 0, bestDist = Math.abs(pct - splits[0]);
            for (var i = 1; i < 3; i++) {
                var d = Math.abs(pct - splits[i]);
                if (d < bestDist) { best = i; bestDist = d; }
            }
            activeHandle = best;
            splits[activeHandle] = pct;
            clampSplits();
            applyClips();
        });

        window.addEventListener('mousemove', function (e) {
            if (activeHandle < 0) return;
            splits[activeHandle] = getPos(e.clientX);
            clampSplits();
            applyClips();
        });

        window.addEventListener('mouseup', function () {
            activeHandle = -1;
        });

        // Touch events
        handles.forEach(function (h, idx) {
            h.addEventListener('touchstart', function (e) {
                e.stopPropagation();
                activeHandle = idx;
            });
        });

        container.addEventListener('touchstart', function (e) {
            if (activeHandle >= 0) return;
            var pct = getPos(e.touches[0].clientX);
            var best = 0, bestDist = Math.abs(pct - splits[0]);
            for (var i = 1; i < 3; i++) {
                var d = Math.abs(pct - splits[i]);
                if (d < bestDist) { best = i; bestDist = d; }
            }
            activeHandle = best;
            splits[activeHandle] = pct;
            clampSplits();
            applyClips();
        });

        window.addEventListener('touchmove', function (e) {
            if (activeHandle < 0) return;
            splits[activeHandle] = getPos(e.touches[0].clientX);
            clampSplits();
            applyClips();
        });

        window.addEventListener('touchend', function () {
            activeHandle = -1;
        });

        // Initial layout
        applyClips();
    });

    // Scene selector tabs
    document.querySelectorAll('.scene-tabs').forEach(function (tabGroup) {
        var targetId = tabGroup.getAttribute('data-target');
        var target = document.getElementById(targetId);
        if (!target) return;

        tabGroup.querySelectorAll('button').forEach(function (btn) {
            btn.addEventListener('click', function () {
                tabGroup.querySelectorAll('button').forEach(function (b) {
                    b.classList.remove('active');
                });
                btn.classList.add('active');
                var scene = btn.getAttribute('data-scene');

                // Update all images in the target quad-compare
                target.querySelectorAll('.qc-layer img').forEach(function (img) {
                    var method = img.getAttribute('data-method');
                    var template = img.getAttribute('data-src-template');
                    if (template && method) {
                        img.src = template.replace('{scene}', scene);
                    }
                });
            });
        });
    });
});