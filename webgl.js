// Basic WebGL demo - Mandelbrot
$(function () {
    var canvas = $('canvas')[0];

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

    // this unform is used to specify the viewport for the fractal
    var viewportUniform = gl.getUniformLocation(program, 'viewport');

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

    // the screen is centred on these coordinates
    var centreX = -0.5;
    var centreY = 0;
    // range of values that will fit on the screen
    var scaleX = 3;
    var scaleY = 3;

    var lastMouseX, lastMouseY;
    $(document).mousemove(function (event) {
        if (lastMouseX || lastMouseY) {
            var dx = event.pageX - lastMouseX;
            var dy = event.pageY - lastMouseY;
            // adjust the centre point when the mouse is moved
            centreX += scaleX * dx * 0.01;
            centreY += scaleY * dy * 0.01;
        }
        lastMouseX = event.pageX;
        lastMouseY = event.pageY;
    });

    function drawFrame() {
        // clear screen
        gl.clearColor(0, 0, 0, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);

        // zoom in
        scaleX *= 0.997;
        scaleY *= 0.997;

        // calculate top-left coordinate
        var x = centreX - scaleX / 2;
        var y = centreY - scaleY / 2;
        // set the viewport
        gl.uniform4f(viewportUniform, x, y, scaleX, scaleY);

        // draw the two triangles
        gl.drawArrays(gl.TRIANGLES, 0, 6);
    }

    (function animationFrame() {
        requestAnimationFrame(animationFrame);
        drawFrame();
    })();
});
