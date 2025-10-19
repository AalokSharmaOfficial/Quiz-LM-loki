import { state } from './state.js';

// --- BACKGROUND FIREBALL ANIMATIONS ---

export function initializeAllFireballs_anim() {
    if (state.animationsDisabled) return false;
    const fireballs = document.querySelectorAll('.fireball');
    fireballs.forEach((fbEl, i) => {
        state.fireballs_anim_array[i] = {
            x: 0,
            y: 0,
            vx: 0,
            vy: 0,
            el: fbEl,
            radius: fbEl.offsetWidth / 2
        };
        initSingleFireball(state.fireballs_anim_array[i]);
    });
    return fireballs.length > 0;
}

function initSingleFireball(fb_obj) {
    if (!fb_obj.el) return;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    fb_obj.x = Math.random() * (viewportWidth - fb_obj.el.offsetWidth);
    fb_obj.y = Math.random() * (viewportHeight - fb_obj.el.offsetHeight);
    let angle = Math.random() * 2 * Math.PI;
    fb_obj.vx = Math.cos(angle) * state.fireballBaseSpeed_anim;
    fb_obj.vy = Math.sin(angle) * state.fireballBaseSpeed_anim;
    fb_obj.el.style.left = fb_obj.x + 'px';
    fb_obj.el.style.top = fb_obj.y + 'px';
}

export function animateFireballs_anim() {
    if (state.animationsDisabled || !state.isAnimating) return;

    state.fireballs_anim_array.forEach((fb, i) => {
        if (!fb || !fb.el) return;
        fb.x += fb.vx;
        fb.y += fb.vy;
        handleWallCollision_anim(fb);
        fb.el.style.left = fb.x + 'px';
        fb.el.style.top = fb.y + 'px';
        for (let j = i + 1; j < state.fireballs_anim_array.length; j++) {
            const fb2 = state.fireballs_anim_array[j];
            if (!fb2 || !fb2.el) return;
            handleFireballCollision_anim(fb, fb2);
        }
    });
    requestAnimationFrame(() => animateFireballs_anim());
}

function handleWallCollision_anim(fb_obj) {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    if (fb_obj.x <= 0 || fb_obj.x >= viewportWidth - fb_obj.el.offsetWidth) {
        fb_obj.vx *= -1;
        fb_obj.x = Math.max(0, Math.min(fb_obj.x, viewportWidth - fb_obj.el.offsetWidth));
    }
    if (fb_obj.y <= 0 || fb_obj.y >= viewportHeight - fb_obj.el.offsetHeight) {
        fb_obj.vy *= -1;
        fb_obj.y = Math.max(0, Math.min(fb_obj.y, viewportHeight - fb_obj.el.offsetHeight));
    }
}

function handleFireballCollision_anim(ball1, ball2) {
    let dx = (ball1.x + ball1.radius) - (ball2.x + ball2.radius);
    let dy = (ball1.y + ball1.radius) - (ball2.y + ball2.radius);
    let distance = Math.sqrt(dx * dx + dy * dy);
    let sumOfRadii = ball1.radius + ball2.radius;
    if (distance < sumOfRadii && distance !== 0) {
        const overlap = sumOfRadii - distance;
        const nx = dx / distance,
            ny = dy / distance;
        ball1.x += nx * overlap / 2;
        ball1.y += ny * overlap / 2;
        ball2.x -= nx * overlap / 2;
        ball2.y -= ny * overlap / 2;
        const tx = -ny,
            ty = nx;
        const dpTan1 = ball1.vx * tx + ball1.vy * ty;
        const dpTan2 = ball2.vx * tx + ball2.vy * ty;
        const dpNorm1 = ball1.vx * nx + ball1.vy * ny;
        const dpNorm2 = ball2.vx * nx + ball2.vy * ny;
        const m1 = dpNorm2,
            m2 = dpNorm1;
        ball1.vx = tx * dpTan1 + nx * m1;
        ball1.vy = ty * dpTan1 + ny * m1;
        ball2.vx = tx * dpTan2 + nx * m2;
        ball2.vy = ty * dpTan2 + ny * m2;
    }
}


// --- TYPEWRITER ANIMATION ---

export async function typewriterAnimate(element, htmlString, speed = 5) {
    if (!element || !htmlString) return;

    element.innerHTML = '';
    const tempContainer = document.createElement('div');
    tempContainer.innerHTML = htmlString;

    const indicator = document.createElement('span');
    indicator.className = 'typing-indicator';

    const typeText = (target, text, speed, indicator) => {
        return new Promise(resolve => {
            let i = 0;
            if (!target.querySelector('.typing-indicator')) target.appendChild(indicator);

            function typeCharacter() {
                if (i < text.length) {
                    indicator.insertAdjacentText('beforebegin', text[i]);
                    i++;
                    setTimeout(typeCharacter, speed);
                } else {
                    if (indicator.parentNode === target) target.removeChild(indicator);
                    resolve();
                }
            }
            typeCharacter();
        });
    };

    const walkAndType = async (sourceNode, targetElement) => {
        for (const child of Array.from(sourceNode.childNodes)) {
            if (child.nodeType === Node.TEXT_NODE) {
                await typeText(targetElement, child.textContent, speed, indicator);
            } else if (child.nodeType === Node.ELEMENT_NODE) {
                const elementChild = child;
                const newElem = document.createElement(elementChild.nodeName);
                for (const attr of Array.from(elementChild.attributes)) newElem.setAttribute(attr.name, attr.value);
                targetElement.appendChild(newElem);
                await walkAndType(child, newElem);
            }
        }
    };
    await walkAndType(tempContainer, element);
}
