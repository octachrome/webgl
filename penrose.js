$(function () {
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
    vertexPositionAttribute = gl.getAttribLocation(program, 'vertexPosition');
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

    var triangleType;
    var t0;
    var t1;
    var t2;
    var sign;

    function initTriangle() {
        // Starting half-kite that fills the screen.
        triangleType = HALF_KITE;
        var scale = 0.1;
        t0 = vectorScale(scale, [3.5, -1.5]);
        t1 = vectorScale(scale, [1.954915021, 3.25528257925]);
        t2 = vectorScale(scale, [-6.5, -1.5]);
        var centre = vectorScale(1/3, vectorAdd(t0, vectorAdd(t1, t2)));
        t0 = vectorSub(t0, centre);
        t1 = vectorSub(t1, centre);
        t2 = vectorSub(t2, centre);
        sign = 1;
    }
    initTriangle();

    function nextTriangle(point) {
        if (triangleType == HALF_DART) {
            var p0 = t2; // apex of the triangle, sitting on its wide base
            var p1 = vectorAdd(t0, vectorScale(PHI_INV, vectorSub(t1, t0))); // point near the right of the base

            if (sign * cross2d(p1, p0, point) < 0.) {
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
            var p0 = vectorAdd(t2, vectorScale(PHI_INV, vectorSub(t0, t2))); // point near the bottom of the left side
            var p1 = vectorAdd(t1, vectorScale(PHI_INV, vectorSub(t2, t1))); // point near the top of the right side
            var p2 = t1; // this point divides the two kite halves: bottom-left corner

            if (sign * cross2d(p0, p1, point) > 0.) {
                t0 = t2;
                t1 = p0;
                t2 = p1;
                triangleType = HALF_DART;
            } else if (sign * cross2d(p0, p2, point)  > 0.) {
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
    }

    var start = new Date().getTime();
    var lastTime;

    function drawFrame() {
        var time = 1 + (new Date().getTime() - start) * RATE;
        gl.uniform1f(timeUniform, time);

        if (lastTime && Math.floor(time) != Math.floor(lastTime)) {
            nextTriangle([0, 0]);
        }
        lastTime = time;

        // var centre = vectorScale(1/3, vectorAdd(t0, vectorAdd(t1, t2)));
        var centre = [0.2, 0];

        var scale = Math.pow(2, time);
        var scaled_t0 = vectorScaleAbout(scale, centre, t0);
        var scaled_t1 = vectorScaleAbout(scale, centre, t1);
        var scaled_t2 = vectorScaleAbout(scale, centre, t2);

        gl.uniform1i(triangleTypeUniform, triangleType);
        gl.uniform2f(t0Uniform, scaled_t0[0], scaled_t0[1]);
        gl.uniform2f(t1Uniform, scaled_t1[0], scaled_t1[1]);
        gl.uniform2f(t2Uniform, scaled_t2[0], scaled_t2[1]);
        gl.uniform1f(signUniform, sign);

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
        return v1[0] * v2[1] - v1[1] * v2[0];
    }

    function vectorScaleAbout(factor, centre, v) {
        return vectorAdd(centre, vectorScale(factor, vectorAdd(v, vectorScale(-1, centre))));
    }
});
