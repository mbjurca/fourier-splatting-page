/**
 * Fourier Title Animation
 *
 * Each letter starts as a perfect circle, then slowly deforms
 * through ellipses and blobs into its final glyph shape,
 * exactly like a Fourier boundary gaining harmonics.
 */
(function () {
    var TEXT = 'Fourier Splatting:';
    var FONT_URL = 'static/fonts/SourceSans3-Bold.ttf';
    var N_SAMPLES = 256;
    var K_MAX = 50;

    // Timeline (ms): circle → ellipse → morph → final → color fade
    var PHASE_CIRCLE = 100;     // show perfect circles briefly
    var PHASE_ELLIPSE = 1000;   // morph circle → ellipse over 1s
    var PHASE_MORPH = 12000;    // slow morph ellipse → letter over 12s
    var PHASE_HOLD = 1000;      // hold final shape
    var PHASE_FADE = 1500;      // fade colors to dark

    var COLORS = [
        '#e63946','#e76f51','#f4a261','#e9c46a','#8ac926',
        '#2a9d8f','#219ebc','#3a86ff','#7209b7','#b5179e',
        '#e63946','#e76f51','#f4a261','#e9c46a','#8ac926',
        '#2a9d8f','#219ebc','#3a86ff'
    ];

    var canvas = document.getElementById('fourier-canvas');
    if (!canvas) return;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);

    // ── Sample glyph outline ──
    function samplePath(path, n) {
        var pts = [];
        var cx = 0, cy = 0, sx = 0, sy = 0;
        var cmds = path.commands;
        for (var i = 0; i < cmds.length; i++) {
            var c = cmds[i];
            if (c.type === 'M') {
                cx = c.x; cy = c.y; sx = c.x; sy = c.y;
                pts.push([cx, cy]);
            } else if (c.type === 'L') {
                pts.push([c.x, c.y]); cx = c.x; cy = c.y;
            } else if (c.type === 'Q') {
                for (var s = 1; s <= 8; s++) {
                    var t = s/8, u = 1-t;
                    pts.push([u*u*cx+2*u*t*c.x1+t*t*c.x, u*u*cy+2*u*t*c.y1+t*t*c.y]);
                }
                cx = c.x; cy = c.y;
            } else if (c.type === 'C') {
                for (var s = 1; s <= 12; s++) {
                    var t = s/12, u = 1-t;
                    pts.push([u*u*u*cx+3*u*u*t*c.x1+3*u*t*t*c.x2+t*t*t*c.x, u*u*u*cy+3*u*u*t*c.y1+3*u*t*t*c.y2+t*t*t*c.y]);
                }
                cx = c.x; cy = c.y;
            } else if (c.type === 'Z') {
                pts.push([sx, sy]); cx = sx; cy = sy;
            }
        }
        if (pts.length < 3) return null;

        var lengths = [0];
        for (var i = 1; i < pts.length; i++) {
            var dx = pts[i][0]-pts[i-1][0], dy = pts[i][1]-pts[i-1][1];
            lengths.push(lengths[i-1]+Math.sqrt(dx*dx+dy*dy));
        }
        var totalLen = lengths[lengths.length-1];
        if (totalLen < 1) return null;

        var sampled = [];
        for (var j = 0; j < n; j++) {
            var target = (j/n)*totalLen;
            var lo = 0, hi = lengths.length-1;
            while (lo < hi-1) { var mid = (lo+hi)>>1; if (lengths[mid]<=target) lo=mid; else hi=mid; }
            var segLen = lengths[hi]-lengths[lo];
            var frac = segLen > 0 ? (target-lengths[lo])/segLen : 0;
            sampled.push([pts[lo][0]+frac*(pts[hi][0]-pts[lo][0]), pts[lo][1]+frac*(pts[hi][1]-pts[lo][1])]);
        }
        return sampled;
    }

    // ── DFT: ordered DC, then +-1, +-2, ... ──
    function computeDFT(points) {
        var N = points.length;
        var all = {};
        var maxK = Math.min(K_MAX, Math.floor(N/2));
        for (var k = -maxK; k <= maxK; k++) {
            var re = 0, im = 0;
            for (var n = 0; n < N; n++) {
                var angle = -2*Math.PI*k*n/N;
                re += points[n][0]*Math.cos(angle) - points[n][1]*Math.sin(angle);
                im += points[n][0]*Math.sin(angle) + points[n][1]*Math.cos(angle);
            }
            all[k] = { re: re/N, im: im/N, freq: k };
        }
        var coeffs = [];
        if (all[0]) coeffs.push(all[0]);                    // index 0: DC
        for (var f = 1; f <= maxK; f++) {
            if (all[-f]) coeffs.push(all[-f]);               // index 1: k=-1
            if (all[f]) coeffs.push(all[f]);                 // index 2: k=+1
        }                                                    // index 3: k=-2, etc.
        return coeffs;
    }

    // ── Reconstruct with first K coefficients ──
    function reconstruct(coeffs, K, nPts) {
        var pts = [];
        var useK = Math.min(K, coeffs.length);
        for (var i = 0; i < nPts; i++) {
            var t = i/nPts, x = 0, y = 0;
            for (var j = 0; j < useK; j++) {
                var c = coeffs[j];
                var a = 2*Math.PI*c.freq*t;
                x += c.re*Math.cos(a) - c.im*Math.sin(a);
                y += c.re*Math.sin(a) + c.im*Math.cos(a);
            }
            pts.push([x, y]);
        }
        return pts;
    }

    // ── Generate a perfect circle at the glyph's center with matching radius ──
    function makeCircle(coeffs, nPts) {
        // DC = center, radius = average amplitude of k=+-1
        var dc = coeffs[0];
        var r = 0;
        if (coeffs.length >= 3) {
            var c1 = coeffs[1], c2 = coeffs[2];
            r = (Math.sqrt(c1.re*c1.re+c1.im*c1.im) + Math.sqrt(c2.re*c2.re+c2.im*c2.im));
        }
        if (r < 2) r = 15; // fallback
        var pts = [];
        for (var i = 0; i < nPts; i++) {
            var angle = 2*Math.PI*i/nPts;
            pts.push([dc.re + r*Math.cos(angle), dc.im + r*Math.sin(angle)]);
        }
        return pts;
    }

    // ── Lerp two point arrays ──
    function lerpPts(a, b, t) {
        var pts = [];
        for (var i = 0; i < a.length; i++) {
            pts.push([a[i][0]+(b[i][0]-a[i][0])*t, a[i][1]+(b[i][1]-a[i][1])*t]);
        }
        return pts;
    }

    function lerpColor(a, b, t) {
        var ar=parseInt(a.slice(1,3),16), ag=parseInt(a.slice(3,5),16), ab=parseInt(a.slice(5,7),16);
        var br=parseInt(b.slice(1,3),16), bg=parseInt(b.slice(3,5),16), bb=parseInt(b.slice(5,7),16);
        return '#'+((1<<24)|(Math.round(ar+(br-ar)*t)<<16)|(Math.round(ag+(bg-ag)*t)<<8)|Math.round(ab+(bb-ab)*t)).toString(16).slice(1);
    }

    // ── Load font and run ──
    if (typeof opentype === 'undefined') { canvas.style.display = 'none'; return; }

    opentype.load(FONT_URL, function (err, font) {
        if (err || !font) {
            canvas.style.display = 'none';
            var fb = document.createElement('span');
            fb.textContent = TEXT; fb.style.cssText = 'font-size:3.2rem;font-weight:700';
            canvas.parentElement.insertBefore(fb, canvas);
            return;
        }

        var fontSize = 90;
        var ascender = font.ascender/font.unitsPerEm*fontSize;
        var lineHeight = ascender - font.descender/font.unitsPerEm*fontSize;
        var NPTS = 200; // reconstruction resolution

        var glyphData = [], totalAdvance = 0, colorIdx = 0;

        for (var i = 0; i < TEXT.length; i++) {
            var ch2 = TEXT[i];
            var glyph = font.charToGlyph(ch2);
            var advance = (glyph.advanceWidth||0)/font.unitsPerEm*fontSize;

            if (ch2 === ' ' || ch2 === ':') {
                glyphData.push({ isSpace: true, char: ch2, advance: advance, offsetX: totalAdvance });
                totalAdvance += advance; continue;
            }

            var path = font.getPath(ch2, totalAdvance, ascender, fontSize);
            var sampled = samplePath(path, N_SAMPLES);

            if (sampled) {
                var coeffs = computeDFT(sampled);
                // Pre-compute key shapes
                var circleShape = makeCircle(coeffs, NPTS);
                var ellipseShape = reconstruct(coeffs, 3, NPTS);  // DC + k=+-1
                glyphData.push({
                    isSpace: false, char: ch2, coeffs: coeffs,
                    circleShape: circleShape, ellipseShape: ellipseShape,
                    offsetX: totalAdvance, advance: advance,
                    color: COLORS[colorIdx % COLORS.length]
                });
            } else {
                glyphData.push({ isSpace: false, char: ch2, coeffs: null,
                    offsetX: totalAdvance, advance: advance,
                    color: COLORS[colorIdx % COLORS.length] });
            }
            colorIdx++;
            totalAdvance += advance;
        }

        var cw = Math.ceil(totalAdvance)+20, chh = Math.ceil(lineHeight)+20;
        canvas.width = cw*dpr; canvas.height = chh*dpr;
        canvas.style.width = cw+'px'; canvas.style.height = chh+'px';
        var ctx = canvas.getContext('2d');
        ctx.setTransform(dpr,0,0,dpr,0,0);
        var padX = 10, padY = 10;

        var totalTime = PHASE_CIRCLE + PHASE_ELLIPSE + PHASE_MORPH + PHASE_HOLD + PHASE_FADE;
        var startTime = null;

        function draw(ts) {
            if (!startTime) startTime = ts;
            var t = ts - startTime;
            ctx.clearRect(0, 0, cw, chh);

            for (var i = 0; i < glyphData.length; i++) {
                var g = glyphData[i];

                if (g.isSpace) {
                    if (g.char === ':') {
                        var colonT = Math.max(0, Math.min(1, (t - PHASE_CIRCLE - PHASE_ELLIPSE - PHASE_MORPH) / 800));
                        if (colonT > 0) {
                            ctx.save();
                            ctx.font = 'bold 90px Source Sans Pro, sans-serif';
                            ctx.fillStyle = 'rgba(36,41,47,'+colonT+')';
                            ctx.fillText(':', g.offsetX+padX, ascender+padY);
                            ctx.restore();
                        }
                    }
                    continue;
                }
                if (!g.coeffs) continue;

                var pts;

                if (t < PHASE_CIRCLE) {
                    // Phase 1: perfect circle
                    pts = g.circleShape;

                } else if (t < PHASE_CIRCLE + PHASE_ELLIPSE) {
                    // Phase 2: circle → ellipse (K=3)
                    var p = (t - PHASE_CIRCLE) / PHASE_ELLIPSE;
                    pts = lerpPts(g.circleShape, g.ellipseShape, p);

                } else if (t < PHASE_CIRCLE + PHASE_ELLIPSE + PHASE_MORPH) {
                    // Phase 3: ellipse → full letter, adding harmonics linearly
                    var p = (t - PHASE_CIRCLE - PHASE_ELLIPSE) / PHASE_MORPH;
                    // K goes from 3 to all coefficients, LINEARLY (no ease = no jumping)
                    var K = Math.floor(3 + p * (g.coeffs.length - 3));
                    K = Math.max(3, Math.min(K, g.coeffs.length));
                    pts = reconstruct(g.coeffs, K, NPTS);

                } else {
                    // Phase 4+: final shape
                    pts = reconstruct(g.coeffs, g.coeffs.length, NPTS);
                }

                // Color: start colored, fade to dark in final phase
                var fadeStart = PHASE_CIRCLE + PHASE_ELLIPSE + PHASE_MORPH + PHASE_HOLD;
                var fadeT = Math.max(0, Math.min(1, (t - fadeStart) / PHASE_FADE));
                var col = fadeT > 0 ? lerpColor(g.color, '#24292f', fadeT) : g.color;

                // Draw
                ctx.beginPath();
                ctx.moveTo(pts[0][0]+padX, pts[0][1]+padY);
                for (var j = 1; j < pts.length; j++) ctx.lineTo(pts[j][0]+padX, pts[j][1]+padY);
                ctx.closePath();

                // During circle/ellipse phase: outline-heavy, light fill
                var morphProgress = Math.max(0, Math.min(1, (t - PHASE_CIRCLE) / (PHASE_ELLIPSE + PHASE_MORPH)));
                var fillAlpha = 0.15 + 0.85 * morphProgress;
                var strokeW = 2.5 - 2.0 * morphProgress;

                ctx.globalAlpha = fillAlpha;
                ctx.fillStyle = col;
                ctx.fill();
                ctx.globalAlpha = 1.0;

                if (strokeW > 0.3) {
                    ctx.strokeStyle = col;
                    ctx.lineWidth = strokeW;
                    ctx.stroke();
                }
            }

            if (t < totalTime + 500) {
                requestAnimationFrame(draw);
            }
        }

        requestAnimationFrame(draw);
    });
})();