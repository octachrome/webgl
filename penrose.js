$(function () {
    'use strict';

    var RATE = 0.0005;
    var HALF_DART = 1; // sitting on wide base, t0 is bottom-left, t1 is bottom-right, t2 is top
    var HALF_KITE = 2; // sitting on narrow base, t0 is bottom-left, t1 is bottom-right, t2 is top
    var PHI = (1. + Math.sqrt(5.)) / 2.;
    var PHI_INV = 1. / PHI;

    var canvas = $('canvas')[0];
    var aspect = canvas.width / canvas.height;

    var gl = canvas.getContext('experimental-webgl');

    /**
     * @param type either gl.VERTEX_SHADER or gl.FRAGMENT_SHADER
     * @param elementSelector a jQuery selector for an element which contains the shader source
     */
    function createShader(type, elementSelector) {
        var shader = gl.createShader(type);
        gl.shaderSource(shader, $(elementSelector).text());
        gl.compileShader(shader);

        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            throw new Error(gl.getShaderInfoLog(shader));
        }

        return shader;
    }

    var vertexShader = createShader(gl.VERTEX_SHADER, '#vertex-shader-src');
    var fragmentShader = createShader(gl.FRAGMENT_SHADER, '#fragment-shader-src');

    var program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error(gl.getProgramInfoLog(program));
    }

    gl.useProgram(program);

    // this attribute is used to specify the position of each vertex
    var vertexPositionAttribute = gl.getAttribLocation(program, 'vertexPosition');
    gl.enableVertexAttribArray(vertexPositionAttribute);

    // this unform is used to specify the aspect ratio of the viewport
    var aspectUniform = gl.getUniformLocation(program, 'aspect');
    gl.uniform1f(aspectUniform, aspect);

    var timeUniform = gl.getUniformLocation(program, 'time');
    var t0Uniform = gl.getUniformLocation(program, 'start_t0');
    var t1Uniform = gl.getUniformLocation(program, 'start_t1');
    var t2Uniform = gl.getUniformLocation(program, 'start_t2');
    var triangleTypeUniform = gl.getUniformLocation(program, 'start_triangleType');
    var signUniform = gl.getUniformLocation(program, 'start_sign');

    // two triangles which cover the whole screen
    // they use normalized device coordinates, to save converting them in the vertex shader
    var vertexPositions = [
        -1.0, -1.0,
        -1.0,  1.0,
         1.0,  1.0,

         1.0,  1.0,
        -1.0, -1.0,
         1.0, -1.0
    ];

    var vertexPositionsBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexPositionsBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertexPositions), gl.STATIC_DRAW);
    gl.vertexAttribPointer(vertexPositionAttribute, 2, gl.FLOAT, false, 0, 0);

    function initTriangle() {
        // Starting half-kite that fills the screen.
        var scale = 2;
        var t0 = vectorScale(scale, [3.5, -1.5]);
        var t1 = vectorScale(scale, [1.954915021, 3.25528257925]);
        var t2 = vectorScale(scale, [-6.5, -1.5]);
        var centre = vectorScale(1/3, vectorAdd(t0, vectorAdd(t1, t2)));
        t0 = vectorSub(t0, centre);
        t1 = vectorSub(t1, centre);
        t2 = vectorSub(t2, centre);

        return {
            type: HALF_KITE,
            sign: 1,
            t0: t0,
            t1: t1,
            t2: t2
        };
    }

    var triangle = initTriangle();

    function nextTriangle(tri, point) {
        var t0 = tri.t0;
        var t1 = tri.t1;
        var t2 = tri.t2;
        var triangleType;
        var sign = tri.sign;
        var p0, p1, p2;

        if (tri.triangleType == HALF_DART) {
            p0 = t2; // apex of the triangle, sitting on its wide base
            p1 = vectorAdd(t0, vectorScale(PHI_INV, vectorSub(t1, t0))); // point near the right of the base

            if (tri.sign * cross2d(p1, p0, point) < 0.) {
                t0 = t1;
                t1 = t2;
                t2 = p1;
                triangleType = HALF_DART;
            } else {
                var tmp = t0;
                t0 = t2;
                t2 = tmp;
                t1 = p1;
                triangleType = HALF_KITE;
                sign *= -1.; // this one is flipped
            }
        } else {
            p0 = vectorAdd(t2, vectorScale(PHI_INV, vectorSub(t0, t2))); // point near the bottom of the left side
            p1 = vectorAdd(t1, vectorScale(PHI_INV, vectorSub(t2, t1))); // point near the top of the right side
            p2 = t1; // this point divides the two kite halves: bottom-left corner

            if (sign * cross2d(p0, p1, point) > 0.) {
                t0 = t2;
                t1 = p0;
                t2 = p1;
                triangleType = HALF_DART;
            } else if (sign * cross2d(p0, p2, point) > 0.) {
                t2 = t1;
                t0 = p0;
                t1 = p1;
                triangleType = HALF_KITE;
                sign *= -1.; // this one is flipped
            } else {
                t2 = t1;
                t1 = t0;
                t0 = p0;
                triangleType = HALF_KITE;
            }
        }

        return {
            type: triangleType,
            sign: sign,
            t0: t0,
            t1: t1,
            t2: t2
        };
    }

    var lastTime = new Date().getTime();
    var time = 0;

    function drawFrame() {
        var delta = (new Date().getTime() - lastTime) * RATE;
        lastTime = new Date().getTime();

        time += delta;
        if (time >= 1) {
            time -= 1;
            triangle = nextTriangle(triangle, [0, 0]);
        }

        gl.uniform1f(timeUniform, time);

        var scale = Math.pow(PHI, delta);
        triangle.t0 = vectorScale(scale, triangle.t0);
        triangle.t1 = vectorScale(scale, triangle.t1);
        triangle.t2 = vectorScale(scale, triangle.t2);

        var angle = delta / 10;
        triangle.t0 = vectorRot(angle, triangle.t0);
        triangle.t1 = vectorRot(angle, triangle.t1);
        triangle.t2 = vectorRot(angle, triangle.t2);

        gl.uniform1i(triangleTypeUniform, triangle.type);
        gl.uniform2f(t0Uniform, triangle.t0[0], triangle.t0[1]);
        gl.uniform2f(t1Uniform, triangle.t1[0], triangle.t1[1]);
        gl.uniform2f(t2Uniform, triangle.t2[0], triangle.t2[1]);
        gl.uniform1f(signUniform, triangle.sign);

        // clear screen
        gl.clearColor(0, 0, 0, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);

        // draw the two triangles
        gl.drawArrays(gl.TRIANGLES, 0, 6);
    }

    (function animationFrame() {
        requestAnimationFrame(animationFrame);
        drawFrame();
    })();

    function vectorScale(factor, v) {
        return [factor * v[0], factor * v[1]];
    }

    function vectorAdd(v1, v2) {
        return [v1[0] + v2[0], v1[1] + v2[1]];
    }

    function vectorSub(v1, v2) {
        return vectorAdd(v1, vectorScale(-1, v2));
    }

    function cross2d(origin, v1, v2) {
        var line1 = vectorSub(v1, origin);
        var line2 = vectorSub(v2, origin);
        return line1[0] * line2[1] - line1[1] * line2[0];
    }

    function vectorScaleAbout(factor, centre, v) {
        return vectorAdd(centre, vectorScale(factor, vectorAdd(v, vectorScale(-1, centre))));
    }

    function vectorRot(angle, v) {
        return [
            v[0] * Math.cos(angle) - v[1] * Math.sin(angle),
            v[0] * Math.sin(angle) + v[1] * Math.cos(angle),
        ];
    }
});
