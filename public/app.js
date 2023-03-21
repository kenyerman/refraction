const WIDTH = 120;
const HEIGHT = 120;
const JUMP = 1;

const [canvas] = document.getElementsByTagName('canvas');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const ctx = canvas.getContext('2d', { willReadFrequently: true });

const drawPixel = (x, y, r, g, b, a, canvasData) => {
    const x0 = Math.floor(((x + 0) / WIDTH)  * canvas.width);
    const x1 = Math.ceil(((x + 1) / WIDTH)  * canvas.width);
    const y0 = Math.floor(((y + 0) / HEIGHT) * canvas.height);
    const y1 = Math.ceil(((y + 1) / HEIGHT) * canvas.height);

    for (let y = y0; y <= y1; y += JUMP) {
        for (let x = x0; x <= x1; x += JUMP) {
            const index = (x + y * canvas.width) * 4;

            canvasData.data[index + 0] = r;
            canvasData.data[index + 1] = g;
            canvasData.data[index + 2] = b;
            canvasData.data[index + 3] = a;
        }
    }
}

const dot = (a, b) => (a.x*b.x) + (a.y*b.y) + (a.z*b.z);
const mul = (a, b) => ({
    x: a.x*b,
    y: a.y*b,
    z: a.z*b
});
const add = (a, b) => ({
    x: a.x + b.x,
    y: a.y + b.y,
    z: a.z + b.z
});
const sub = (a, b) => add(a, mul(b, -1));
const pow2 = (a) => dot(a,a);
const len = (a) => Math.sqrt(pow2(a));
const norm = (a) => {
    const d = Math.sqrt(pow2(a));
    return {
        x: a.x / d,
        y: a.y / d,
        z: a.z / d,
    }
};
const rotX = (a, d) => ({
    x: a.x,
    y: (a.y * Math.cos(d)) - (a.z * Math.sin(d)),
    z: (a.y * Math.sin(d)) + (a.z * Math.cos(d))
});
const rotY = (a, d) => ({
    x: (a.x * Math.cos(d)) + (a.z * Math.sin(d)),
    y: a.y,
    z: -(a.x * Math.sin(d)) + (a.z * Math.cos(d))
});
const rotZ = (a, d) => ({
    x: (a.x * Math.cos(d)) - (a.y * Math.sin(d)),
    y: (a.x * Math.sin(d)) + (a.y * Math.cos(d)),
    z: a.z
})

const intersectLineWithSphere = (line, sphere) => {
    const o_c = sub(line.o, sphere.c);
    const o_c2 = pow2(o_c);
    const r2 = sphere.r * sphere.r;
    const b = dot(line.u, o_c);
    const b2 = b*b;
    const discriminant = b2 - (o_c2 - (r2));

    // skip tangents also
    if (discriminant <= 0) {
        return null;
    }

    const d = Math.sqrt(discriminant)-b;

    // intersection
    const point = add(line.o, mul(line.u, d));

    const normal = norm(sub(point, sphere.c));

    return {
        color: sphere.color,
        strength: Math.abs(dot(normal, line.u)),
        distance: len(sub(line.o, point)),
        reflection: {
            o: { ...point },
            u: { ...sub(line.u, mul(normal, 2*dot(line.u, normal))) }
        }
    }
};

const hasPointEps = (line, point, eps = 0.001) => {
    const v1 = norm(sub(point, line.o));
    const v2 = {...line.u};

    const diff = len(sub(v2, v1));

    return diff < eps;
}

const ddFOV = 0.007;
let FOV = 1;
let dFOV = -ddFOV;
const createLineFromCamera = (x,y) => ({
    o: {
        x: ((2 * (x/WIDTH)) - 1),
        y: ((2 * (y/HEIGHT)) - 1),
        z: 1,
    },
    u: norm({
        x: FOV * ((2 * (x/WIDTH)) - 1),
        y: FOV * ((2 * (y/HEIGHT)) - 1),
        z: -1,
    })
});

const R = 0.3;
const D = 0.45;
const spheres = [
    {
        r: R,
        c: {
            x: -D,
            y: 0,
            z: 0,
        },
        color: [0x00, 0xff, 0x00],
    },
    {
        r: R,
        c: {
            x: D,
            y: 0,
            z: 0,
        },
        color: [0x00, 0xff, 0xff],
    },
    {
        r: R,
        c: {
            x: 0,
            y: -D,
            z: 0,
        },
        color: [0xff, 0x00, 0x00],
    },
    {
        r: R,
        c: {
            x: 0,
            y: D,
            z: 0,
        },
        color: [0xff, 0x00, 0xff],
    },
    {
        r: R,
        c: {
            x: 0,
            y: 0,
            z: D,
        },
        color: [0xff, 0xff, 0x00],
    },
    {
        r: R,
        c: {
            x: 0,
            y: 0,
            z: -D,
        },
        color: [0x00, 0x00, 0xff],
    },
]

const fpsHolder = document.getElementById('fps');
const widthHolder = document.getElementById('width');
widthHolder.textContent = `WIDTH: ${WIDTH}`;
const heightHolder = document.getElementById('height');
heightHolder.textContent = `HEIGHT: ${HEIGHT}`;

let aX = 0;
let aY = 0;
let aZ = 0;
let last = new Date();

const draw = () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const canvasData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    for (let y = 0; y < HEIGHT; y += 1) {
        for (let x = 0; x < WIDTH; x += 1) {

            const l = createLineFromCamera(x,y);
            l.o = rotX(l.o, aX);
            l.u = rotX(l.u, aX);
            l.o = rotY(l.o, aY);
            l.u = rotY(l.u, aY);
            l.o = rotZ(l.o, aZ);
            l.u = rotZ(l.u, aZ);

            const [res] = spheres
                .map(s => intersectLineWithSphere(l, s))
                .filter(s => !!s)
                .sort((a, b) => {
                    if (a.distance < b.distance) {
                        return -1;
                    }

                    if (b.distance < a.distance) {
                        return 1;
                    }

                    if (a.strength < b.strength) {
                        return -1;
                    }

                    if (b.strength < a.strength) {
                        return 1;
                    }

                    return 0;
                });

            if (!res) {
                continue;
            }

            const [r,g,b] = res.color;
            const s = res.strength;

            drawPixel(x, y, r, g, b, s*255, canvasData);
        }
    }

    ctx.putImageData(canvasData, 0, 0);

    const now = new Date();
    const delta = (now.valueOf() - last.valueOf()) / 1000;
    const fps = 1/delta;
    last = now;

    fpsHolder.textContent = `FPS: ${fps.toFixed()}`;

    aX = ((aX+0.01) % 360);
    aY = ((aY+0.01) % 360);
    aZ = ((aZ+0.01) % 360);

    FOV += dFOV;

    if (FOV <= 0) {
        dFOV = ddFOV;
    }

    if (1 <= FOV) {
        dFOV = -ddFOV;
    }

    requestAnimationFrame(draw);
}


const startdemo = () => {
    const hide = document.getElementById('hide');
    hide.classList.add('hide');

    setTimeout(() => {
        hide.parentElement.removeChild(hide);
    }, 1000);

    const iframe = document.getElementById('player');
    const widget = SC.Widget(iframe.id);
    widget.play();

    draw();
}

const togglePlayer = () => {
    document.getElementById('player-holder').classList.toggle('show');
}