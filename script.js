// Intro
let body = document.querySelector("body");

// Main elements
let container = document.querySelector("#container");
let content = document.querySelector("#content");
let paths = document.querySelector("#paths");

// UI elements
let uiX = document.querySelector(".ui-x");
let uiY = document.querySelector(".ui-y");
let uiVelX = document.querySelector(".ui-velX");
let uiVelY = document.querySelector(".ui-velY");
let uiTargetVelX = document.querySelector(".ui-targetVelX");
let uiTargetVelY = document.querySelector(".ui-targetVelY");
let uiScale = document.querySelector(".ui-scale");
let backgroundN = document.querySelector("#background-n");
let backgroundE = document.querySelector("#background-e");
let backgroundS = document.querySelector("#background-s");
let backgroundW = document.querySelector("#background-w");
let trackers = document.querySelector("#trackers");

// Main variables
let windowWidth = window.innerWidth;
let windowHeight = window.innerHeight;
let mousePos = [0.5, 0.5]; // x, y
let vel = [0, 0]; // x, y
let targetVel = [0, 0]; // x, y
let maxVel = 100;
let mult = 1;
let range = .05; // margin from window perimeter for mouse detection (0–1)
let pos = [0, 0]; // x, y;
let pause = false;
let floaters = {};
let zoomLevel = 1;

// Floater class
class Floater {
	constructor(id, src, origin, dim, url) {
		this.id = id;
		
		// Set properties
		this.src = src;
		this.dim = dim; // width
		this.origin = origin; // x, y
		this.pos = this.origin;
		this.rot = Math.round(Math.random()*30-15);
		this.acc = parseFloat((Math.random()*2+.2).toFixed(2));
		// this.opacity = parseFloat((Math.random()*.3+.5).toFixed(2));
		this.opacity = 1;
		this.visible = true;
		this.trackerVisible = true;
		this.trackerScale = 50;
		this.trackerColor = "white";

		// Create element
		let floater = document.createElement("div");
		floater.id = "floater"+this.id;
		floater.dataset.id = this.id;
		floater.classList.add("floater");
		floater.style.left = `calc(50% - ${this.dim[0]/2}px)`; // set reference to center
		floater.style.top = `calc(50% - ${this.dim[1]/2}px)`; // set reference to center
		floater.style.width = `${this.dim[0]}px`;
		floater.style.height = `${this.dim[1]}px`;
		floater.style.opacity = this.opacity;
		floater.style.zIndex = Math.round(this.acc*100);
		floater.style.transform = `translate(${this.pos[0]}px, ${this.pos[1]}px) rotate(${this.rot}deg)`;

		content.appendChild(floater);
		this.dom = floater;

		// Generate linked tracker and tracker dot
		let tracker = document.createElement("div");
		tracker.id = "tracker"+this.id;
		tracker.classList.add("tracker");
		tracker.style.width = this.trackerScale + "px";
		tracker.style.height = this.trackerScale + "px";

		let trackerDot = document.createElement("div");
		trackerDot.classList.add("tracker-dot");
		tracker.appendChild(trackerDot);

		trackers.appendChild(tracker);
		this.tracker = tracker;
		this.trackerDot = trackerDot;

		// Wikipedia
		if (settings["mode"] == "wikipedia") {
			floater.dataset.wikipedia = 1;
			let initialized = false;
			floater.addEventListener('mouseenter', () => {
				if (!initialized) {
					floater.innerHTML = `<iframe src="${`https://en.wikipedia.org/wiki/${url}`}"></iframe>`;
					initialized = true;
				}
			})
			floater.addEventListener('dblclick', () => {window.open(`https://en.wikipedia.org/wiki/${url}`, '_blank').focus();})
		} else if (settings["mode"] == "maps") {
			floater.style.backgroundImage = `url("${this.src}")`;
		}
	}

	// Move origin by inputted amount
	shift(x, y) {
		this.origin = [
			this.origin[0] - x,
			this.origin[1] - y
		]
	}

	// Track movement according to global velocity
	move() {
		// Main element movement
		this.pos = [
			this.origin[0] + pos[0]*this.acc,
			this.origin[1] + pos[1]*this.acc
		]
		this.dom.style.transform = `translate(${this.pos[0]}px, ${this.pos[1]}px) rotate(${this.rot}deg)`;

		// Calculate bounds to detect if floater is visible
		let bounds = [
			(this.pos[1] - this.dim[1]/2)*zoomLevel, // top
			(this.pos[0] + this.dim[0]/2)*zoomLevel, // right
			(this.pos[1] + this.dim[1]/2)*zoomLevel, // bottom
			(this.pos[0] - this.dim[0]/2)*zoomLevel  // left
		]

		// Hide floater if far enough offscreen (broken code)
		if ((bounds[1] >= -windowWidth/2-500 && bounds[3] <= windowWidth/2+500) && (bounds[2] >= -windowHeight/2-500 && bounds[0] <= windowHeight/2+500)) {
			this.dom.style.display = "block";
		} else {
			this.dom.style.display = "none";
		}
		
		// Tracker movement
		if (bounds[1] >= -windowWidth/2 && bounds[3] <= windowWidth/2 && bounds[2] >= -windowHeight/2 && bounds[0] <= windowHeight/2) {
			this.tracker.style.display = "none";
		} else {
			this.tracker.style.display = "flex";

			// Set x position
			if (this.pos[0]*zoomLevel-this.trackerScale/2 < -windowWidth/2) {
				this.tracker.style.left = `0`;
				this.tracker.style.right = `unset`;
			} else if (this.pos[0]*zoomLevel+this.trackerScale/2 > windowWidth/2) {
				this.tracker.style.left = `unset`;
				this.tracker.style.right = `0`;
			} else {
				this.tracker.style.left = `${this.pos[0]*zoomLevel+windowWidth/2-this.trackerScale/2}px`;
				this.tracker.style.right = `unset`;
			}

			// Set y position
			if (this.pos[1]*zoomLevel-this.trackerScale/2 < -windowHeight/2) {
				this.tracker.style.top = `0`;
				this.tracker.style.bottom = `unset`;
			} else if (this.pos[1]*zoomLevel+this.trackerScale/2 > windowHeight/2) {
				this.tracker.style.top = `unset`;
				this.tracker.style.bottom = `0`;
			} else {
				this.tracker.style.top = `${this.pos[1]*zoomLevel+windowHeight/2-this.trackerScale/2}px`;
				this.tracker.style.bottom = `unset`;
			}

			// Scale tracker based on distance from viewport
			let distance = Math.sqrt(Math.pow((this.pos[0]*zoomLevel), 2) + Math.pow((this.pos[1]*zoomLevel), 2)); // actual distance
			let minDistance = Math.sqrt(Math.pow(this.dim[0], 2) + Math.pow(this.dim[1], 2)); // minimum possible distance to floater
			let trackerScale = 1;
			if (minDistance/distance > 1) {
				trackerScale = 1;
			} else if (minDistance/distance < .1) {
				trackerScale = .1;
			} else {
				trackerScale = minDistance/distance;
			}
			this.tracker.style.transform = `scale(${trackerScale})`;
		}
	}

	// Toggle visibility of main element
	toggleVisibility() {
		if (this.visible == false) {
			this.visible = true;
			this.dom.style.display = "block";
		} else {
			this.visible = false;
			this.dom.style.display = "none";
		}
	}

	// Toggle visibility of tracking element
	toggleTrackerVisibility() {
		if (this.trackerVisible == false) {
			this.trackerVisible = true;
			this.tracker.style.display = "block";
		} else {
			this.trackerVisible = false;
			this.tracker.style.display = "none";
		}
	}
}

// Draggable elements
function grabFloater(floater) {
	let id = floater.dataset.id;
	let floaterObject = floaters[id];
	let offsetMovement;
	// Account for change in mouse position
	let prevMousePos = [0, 0];
	let deltaMousePos = [0, 0];
	// Account for change in main position
	let prevPos = [0, 0];
	let deltaPos = [0, 0];
	floater.addEventListener("mousedown", grabMouseDown);
	
	function grabMouseDown(e) {
		resetMouse();
		prevMousePos = [e.clientX, e.clientY];
		prevPos = pos;
		document.addEventListener("mouseup", closeGrabFloater);
		document.addEventListener("wheel", closeGrabFloater);
		document.addEventListener("mousemove", dragFloater);

		// Compensate for main movement
		offsetMovement = setInterval(() => {
			deltaPos = [
				prevPos[0] - pos[0],
				prevPos[1] - pos[1]
			]
			floaterObject.shift(-deltaPos[0]*floaterObject.acc, -deltaPos[1]*floaterObject.acc);
			prevPos = pos;
		}, 1)
	}

	function dragFloater(e) {
		deltaMousePos = [
			prevMousePos[0] - e.clientX,
			prevMousePos[1] - e.clientY
		]
		floaterObject.shift(deltaMousePos[0]/zoomLevel, deltaMousePos[1]/zoomLevel);
		prevMousePos = [e.clientX, e.clientY];
	}

	function closeGrabFloater() {
		clearInterval(offsetMovement);
		document.removeEventListener("mouseup", closeGrabFloater);
		document.removeEventListener("mousemove", dragFloater);
	}
}

// Get mouse position relative to screen
let pauseMouse = false;
function trackMouse(e) {
	if (pauseMouse == false) {
		// Set mouse x and y as percentages 0–1
		mousePos = [
			e.clientX/windowWidth,
			e.clientY/windowHeight
		]

		// Detect if mouse is at borders and change target velocity
		// x velocity
		if (mousePos[0] > 1-range) {
			targetVel[0] = ((mousePos[0]-(1-range))/range)*mult;
		} else if (mousePos[0] < range) {
			targetVel[0] = -((range-mousePos[0])/range)*mult;
		} else {
			targetVel[0] = 0;
		}
		// y velocity
		if (mousePos[1] > 1-range) {
			targetVel[1] = ((mousePos[1]-(1-range))/range)*mult;
		} else if (mousePos[1] < range) {
			targetVel[1] = -((range-mousePos[1])/range)*mult;
		} else {
			targetVel[1] = 0;
		}

		// Display the correct cursor and direction indicator
		if (mousePos[0] > 1-range && mousePos[1] < 0+range){
			container.style.cursor = "ne-resize";
			backgroundN.style.opacity = (range-mousePos[1])/range;
			backgroundE.style.opacity = (mousePos[0]-1+range)/range;
			backgroundS.style.opacity = 0;
			backgroundW.style.opacity = 0;
		} else if (mousePos[0] > 1-range && mousePos[1] > 1-range){
			container.style.cursor = "se-resize";
			backgroundS.style.opacity = (mousePos[1]-1+range)/range;
			backgroundE.style.opacity = (mousePos[0]-1+range)/range;
			backgroundN.style.opacity = 0;
			backgroundW.style.opacity = 0;
		} else if (mousePos[0] < 0+range && mousePos[1] > 1-range){
			container.style.cursor = "sw-resize";
			backgroundS.style.opacity = (mousePos[1]-1+range)/range;
			backgroundW.style.opacity = (range-mousePos[0])/range;
			backgroundE.style.opacity = 0;
			backgroundN.style.opacity = 0;
		} else if (mousePos[0] < 0+range&& mousePos[1] < 0+range){
			container.style.cursor = "nw-resize";
			backgroundN.style.opacity = (range-mousePos[1])/range;
			backgroundW.style.opacity = (range-mousePos[0])/range;
			backgroundE.style.opacity = 0;
			backgroundS.style.opacity = 0;
		} else if (mousePos[1] < 0+range) {
			container.style.cursor = "n-resize";
			backgroundN.style.opacity = (range-mousePos[1])/range;
			backgroundE.style.opacity = 0;
			backgroundS.style.opacity = 0;
			backgroundW.style.opacity = 0;
		} else if (mousePos[0] > 1-range) {
			container.style.cursor = "e-resize";
			backgroundE.style.opacity = (mousePos[0]-1+range)/range;
			backgroundN.style.opacity = 0;
			backgroundS.style.opacity = 0;
			backgroundW.style.opacity = 0;
		} else if (mousePos[1] > 1-range) {
			container.style.cursor = "s-resize";
			backgroundS.style.opacity = (mousePos[1]-1+range)/range;
			backgroundE.style.opacity = 0;
			backgroundN.style.opacity = 0;
			backgroundW.style.opacity = 0;
		} else if (mousePos[0] < 0+range) {
			container.style.cursor = "w-resize";
			backgroundW.style.opacity = (range-mousePos[0])/range;
			backgroundE.style.opacity = 0;
			backgroundS.style.opacity = 0;
			backgroundN.style.opacity = 0;
		} else {
			container.style.cursor = "crosshair";
			backgroundN.style.opacity = 0;
			backgroundE.style.opacity = 0;
			backgroundS.style.opacity = 0;
			backgroundW.style.opacity = 0;
		}
	}
}
function resetMouse() {
	windowWidth = window.innerWidth;
	windowHeight = window.innerHeight;
	mousePos = [0.5, 0.5];
	targetVel = [0, 0];
	container.style.cursor = "crosshair";
	backgroundN.style.opacity = 0;
	backgroundE.style.opacity = 0;
	backgroundS.style.opacity = 0;
	backgroundW.style.opacity = 0;
}

// Scroll to zoom
let zoomStep = 0.03;
function zoom(e) {
	e.preventDefault();
	if (e.ctrlKey) {
		if (e.deltaY > 1) {
			if (zoomLevel <= .25) {
				zoomLevel = .25;
			} else {
				zoomLevel = +(zoomLevel-zoomStep).toFixed(2);
			}
		} else if (e.deltaY < -1) {
			if (zoomLevel >= 2) {
				zoomLevel = 2;
			} else {
				zoomLevel = +(zoomLevel+zoomStep).toFixed(2);
			}
		}
		content.style.transform = `translate(-50%, -50%) scale(${zoomLevel})`;
	} else {
		// Scroll wheel velocities
		let scrollVelX = e.deltaX/50;
		if (scrollVelX > 1) {
			scrollVelX = 1;
		} else if (scrollVelX < -1) {
			scrollVelX = -1;
		}
		targetVel[0] = parseFloat((scrollVelX).toFixed(1));

		let scrollVelY = e.deltaY/50;
		if (scrollVelY > 1) {
			scrollVelY = 1;
		} else if (scrollVelY < -1) {
			scrollVelY = -1;
		}
		targetVel[1] = parseFloat((scrollVelY).toFixed(1));
	}
}

// Mobile movement
let mobilePos = [0, 0];
let mobilePosDelta = [0, 0];
let trackMobileFinished = true;
function trackMobile(e) {
	e.preventDefault();

	mobilePosDelta = [mobilePos[0]-e.touches[0].clientX, mobilePos[1]-e.touches[0].clientY];
	mobilePos = [e.touches[0].clientX, e.touches[0].clientY];

	if (trackMobileFinished) {
		trackMobileDecay();
	}
}
function trackMobileDecay() {
	if (mobilePosDelta[0] < .01 && mobilePosDelta[0] > -.01) {
		mobilePosDelta[0] = 0;
	}
	if (mobilePosDelta[1] < .01 && mobilePosDelta[1] > -.01) {
		mobilePosDelta[1] = 0;
	}
	if (mobilePosDelta[0] == 0 && mobilePosDelta[1] == 0) {
		targetVel = [0, 0];
		trackMobileFinished = true;
		return
	}

	let scrollVelX = mobilePosDelta[0]/10;
	if (scrollVelX > 1) {
		scrollVelX = 1;
	} else if (scrollVelX < -1) {
		scrollVelX = -1;
	}
	targetVel[0] = parseFloat((scrollVelX).toFixed(1));

	let scrollVelY = mobilePosDelta[1]/10;
	if (scrollVelY > 1) {
		scrollVelY = 1;
	} else if (scrollVelY < -1) {
		scrollVelY = -1;
	}
	targetVel[1] = parseFloat((scrollVelY).toFixed(1));

	mobilePosDelta = [mobilePosDelta[0]*.99, mobilePosDelta[1]*.99];
	requestAnimationFrame(trackMobileDecay);
}

// Generate paths
function generatePath(endPos, total) {
	// Set max dimensions and start at center
	let dim = Math.floor(Math.max(Math.abs(endPos[0]), Math.abs(endPos[1]))*1.5);

	// Start SVG as HTML string
	let path = `<svg class="path" style="width:${dim*2}px; height:${dim*2}px;" viewBox="0 0 ${dim*2} ${dim*2}"><filter id="displacementFilter"><feTurbulence type="turbulence" baseFrequency=".1" numOctaves="10" result="turbulence" /><feDisplacementMap in2="turbulence" in="SourceGraphic" scale="1" xChannelSelector="R" yChannelSelector="G" /></filter>`

	for (let iteration=0; iteration<total; iteration++) {
		let pointPos = [dim, dim];
		path += `<path d="m ${dim},${dim} `;

		// Set intermediary targets
		let targets = [];
		for (let i=0; i<Math.floor(Math.random()*5); i++) {
			targets.push([Math.floor(Math.random()*dim*2), Math.floor(Math.random()*dim*2)]);
		}
		targets.push([dim/2+endPos[0], dim/2+endPos[1]]);
	
		// Draw points until target is reached
		for (let t of targets) {
			let target = [t[0], t[1]];
			let reachEnd = false;
			while (!reachEnd) {
				let prevPoint = pointPos;
				if (pointPos[0] < target[0]) {
					pointPos = [Math.round((pointPos[0]+Math.random()*50)), pointPos[1]];
				} else {
					pointPos = [Math.round((pointPos[0]-Math.random()*50)), pointPos[1]];
				}
				if (pointPos[1] < target[1]) {
					pointPos = [pointPos[0], Math.round((pointPos[1]+Math.random()*50))];
				} else {
					pointPos = [pointPos[0], Math.round((pointPos[1]-Math.random()*50))];
				}
	
				let distance = [prevPoint[0]-pointPos[0], prevPoint[1]-pointPos[1]];
		
				path += `
					C ${pointPos[0]},${pointPos[1]}
					${Math.round((prevPoint[0]+Math.random()*distance[0]))},${Math.round((prevPoint[1]+Math.random()*distance[1]))}
					${Math.round((pointPos[0]-Math.random()*distance[0]))},${Math.round((pointPos[1]-Math.random()*distance[1]))}
				`;
		
				if (Math.abs(pointPos[0]-target[0]) < 200 && Math.abs(pointPos[1]-target[1]) < 200) {
					reachEnd = true;
				}
			}
		}

		path += `" pathLength="1" />`
	}

	path += `"</svg>`
	paths.innerHTML += path;
}

// Main loop
function begin() {
	const intro = document.querySelector('.intro');
	intro.dataset.active = 0;

	// Range
	let range = 5000;
	if (settings['range'] == 'near') {
		range = 15000;
	} else if (settings['range'] == 'far') {
		range = 50000;
	}

	// Generate floaters
	let index = 0;
	while (index < settings["quantity"]) {
		if (settings["mode"] == "wikipedia") {
			let floater = new Floater(index, `assets/maps/map${Math.floor(Math.random()*195)}.jpg`, [Math.round(Math.random()*range-(range/2)), Math.round(Math.random()*range-(range/2))], [Math.round(Math.random()*2000+300), Math.round(Math.random()*2000+300)], randoms[index].title);
			floaters[index] = floater;
			grabFloater(floater.dom);
		} else if (settings["mode"] == "maps") {
			let floater = new Floater(index, `assets/maps/map${Math.floor(Math.random()*195)}.jpg`, [Math.round(Math.random()*range-(range/2)), Math.round(Math.random()*range-(range/2))], [Math.round(Math.random()*2000+300), Math.round(Math.random()*2000+300)], undefined);
			floaters[index] = floater;
			grabFloater(floater.dom);
			index++;
		}
		index++;
	}
	
	if (settings["tour"]) {
		startTour();
	} else {
		// Begin tracking mouse
		container.addEventListener("mousemove", trackMouse);
		container.addEventListener('touchmove', trackMobile);
		window.addEventListener("resize", resetMouse);
		container.addEventListener('mouseleave', resetMouse);
		container.addEventListener('wheel', zoom, {passive: false});
	}

	// Start main loop
	mainLoop();
}

function mainLoop() {
	// Adjust main position and background
	pos = [
		parseFloat((pos[0]-vel[0]*15).toFixed(5)),
		parseFloat((pos[1]-vel[1]*15).toFixed(5))
	]
	content.style.backgroundPosition = `${pos[0]/5}px ${pos[1]/5}px`;

	// Move paths
	paths.style.transform = `translate(calc(${pos[0]}px - 50%), calc(${pos[1]}px - 50%))`;

	// Adjust velocity toward target velocity
	vel = [
		parseFloat((vel[0]-((vel[0]-targetVel[0])/100)).toFixed(5)),
		parseFloat((vel[1]-((vel[1]-targetVel[1])/100)).toFixed(5)),
	]

	// Set velocity to 0 when small enough
	// x velocity
	if (vel[0] < .001 && vel[0] > -.001) {
		vel = [0, vel[1]];
	}
	// y velocity
	if (vel[1] < .001 && vel[1] > -.001) {
		vel = [vel[0], 0];
	}

	// Move objects
	for (let floater of Object.keys(floaters)) {
		floaters[floater].move();
	}

	// Set UI values
	uiX.innerText = -pos[0].toFixed(2);
	uiY.innerText = -pos[1].toFixed(2);
	uiVelX.innerText = vel[0].toFixed(2);
	uiVelY.innerText = vel[1].toFixed(2);
	uiTargetVelX.innerText = targetVel[0].toFixed(2);
	uiTargetVelY.innerText = targetVel[1].toFixed(2);
	uiScale.innerText = zoomLevel.toFixed(2);

	// Restart loop
	requestAnimationFrame(mainLoop);
}

// Automation
let target;
let arrived = [false, false];
let targetZoom = Math.random()*1.75+.25;
function startTour() {
	// Range
	let range = 5000;
	if (settings['range'] == 'near') {
		range = 15000;
	} else if (settings['range'] == 'far') {
		range = 50000;
	}

	target = [Math.round(Math.random()*range-(range/2)), Math.round(Math.random()*range-(range/2))];
	console.log(target);
	tourLoop();
}
function tourLoop() {
	// Check for arrival x
	if (Math.abs(pos[0]-target[0]) < 100) {
		targetVel = [0, targetVel[1]];
		arrived = [true, arrived[1]];
	} else {
		if (pos[0] < target[0]) {
			targetVel = [-(Math.random()*.5+.5), targetVel[1]];
		} else {
			targetVel = [Math.random()*.5+.5, targetVel[1]];
		}
	}

	// Check for arrival y
	if (Math.abs(pos[1]-target[1]) < 100) {
		targetVel = [targetVel[0], 0];
		arrived = [arrived[0], true];
	} else {
		if (pos[1] < target[1]) {
			targetVel = [targetVel[0], -(Math.random()*.5+.5)];
		} else {
			targetVel = [targetVel[0], Math.random()*.5+.5];
		}
	}

	// Restart
	if (arrived[0] == true && arrived[1] == true) {
		arrived = [false, false];
		targetVel = [0, 0];
		setTimeout(() => {
			targetZoom = Math.random()*1.75+.25;
			simulateZoom();
		}, 2000)
	} else {
		requestAnimationFrame(tourLoop);
	}
}
function simulateZoom() {
	if (Math.abs(zoomLevel - targetZoom) < .02) {
		setTimeout(() => {
			startTour();
		}, 1000)
		return
	} else if (zoomLevel < targetZoom) {
		zoomLevel += .01;
	} else {
		zoomLevel -= .01;
	}

	content.style.transform = `translate(-50%, -50%) scale(${zoomLevel})`;
	requestAnimationFrame(simulateZoom);
}

// Controls
let settings = {
	"mode": "maps",
	"quantity": 250,
	"range": 'near',
	"trails": false,
	"ui": true,
	"tour": false,
	"blur": false
}
function setMode(setting, elmnt) {
	settings['mode'] = setting;
	for (let toggle of document.querySelectorAll('#controls-mode .controls-toggle')) {
		toggle.dataset.active = 0;
	}
	elmnt.dataset.active = 1;
}
function setQuantity(setting, elmnt) {
	settings['quantity'] = setting;
	for (let toggle of document.querySelectorAll('#controls-quantity .controls-toggle')) {
		toggle.dataset.active = 0;
	}
	elmnt.dataset.active = 1;
}
function setRange(setting, elmnt) {
	settings['range'] = setting;
	for (let toggle of document.querySelectorAll('#controls-range .controls-toggle')) {
		toggle.dataset.active = 0;
	}
	elmnt.dataset.active = 1;
}
function setTrails(setting, elmnt) {
	settings['trails'] = setting;
	for (let toggle of document.querySelectorAll('#controls-trails .controls-toggle')) {
		toggle.dataset.active = 0;
	}
	elmnt.dataset.active = 1;
}
function setUI(setting, elmnt) {
	settings['ui'] = setting;
	for (let toggle of document.querySelectorAll('#controls-ui .controls-toggle')) {
		toggle.dataset.active = 0;
	}
	elmnt.dataset.active = 1;
}
function setTour(setting, elmnt) {
	settings['tour'] = setting;
	for (let toggle of document.querySelectorAll('#controls-tour .controls-toggle')) {
		toggle.dataset.active = 0;
	}
	elmnt.dataset.active = 1;
}
function setBlur(setting, elmnt) {
	settings['blur'] = setting;
	for (let toggle of document.querySelectorAll('#controls-blur .controls-toggle')) {
		toggle.dataset.active = 0;
	}
	elmnt.dataset.active = 1;
}

// Get started
let randoms;
function initSettings() {
	if (settings['mode'] == "wikipedia") {
		let url = "https://en.wikipedia.org/w/api.php"; 
		const params = {
			action: "query",
			format: "json",
			list: "random",
			rnnamespace: "0",
			rnlimit: "500"
		};
		url = url + "?origin=*";
		Object.keys(params).forEach(function(key){url += "&" + key + "=" + params[key];});
		fetch(url)
			.then(function(response){return response.json();})
			.then(function(response) {
				randoms = response.query.random;
				console.log(randoms);
				begin();
			})
	} else if (settings['mode'] == "maps") {
		begin();
	}

	if (settings['trails']) {
		generatePath([Math.random()*2000, Math.random()*2000], 5);
	}
	if (!settings['ui']) {
		document.querySelector('#container').dataset.ui = 0;
	}
	if (settings['blur']) {
		document.querySelector('#container').dataset.blur = 1;
	}
}

// TODO for someday
// add ui overlay for wikipedia links
// fetch new data for maps