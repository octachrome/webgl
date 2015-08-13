$(function () {
    var RATE = 0.0005;
    var HALF_DART = 1; // sitting on wide base, t0 is bottom-left, t1 is bottom-right, t2 is top
    var HALF_KITE = 2; // sitting on narrow base, t0 is bottom-left, t1 is bottom-right, t2 is top

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
    // they use normalized device coordinates, to save convering them in the vertex shader
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

    var start = new Date().getTime();

    function drawFrame() {
        // Starting half-kite that fills the screen.
        gl.uniform1i(triangleTypeUniform, HALF_KITE);
        gl.uniform2f(t0Uniform, 2.5, -2.5);
        gl.uniform2f(t1Uniform, 0.954915021, 2.25528257925);
        gl.uniform2f(t2Uniform, -7.5, -2.5);
        gl.uniform1f(signUniform, 1);

        var time = (new Date().getTime() - start) * RATE;
        time = time - Math.floor(time);
        gl.uniform1f(timeUniform, time);

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
});
