// ============= VISUAL TRAIL MAP (Canvas-based) =============
// Shows the actual branching structure of the Oregon Trail

const TrailMapCanvas = {
    canvas: null,
    ctx: null,
    nodes: [],
    connections: [],
    hoveredNode: null,
    animationFrame: null,
    
    // Visual settings
    colors: {
        background: '#5c4a32',
        pathDefault: '#c9a227',
        pathStroke: '#8b6914',
        pathVisited: '#51cf66',
        pathGlow: '#ffd700',
        nodeVisited: '#51cf66',
        nodeCurrent: '#ffd700',
        nodeUpcoming: '#4a9f4a',
        nodeLocked: '#666666',
        border: '#6b4423',
        text: '#f4e8d0',
        textDim: '#8b7355',
        vines: '#2d5a1f',
        branchPoint: '#9b59b6'
    },
    
    nodeTypes: {
        fort: { icon: '🏰', baseSize: 18 },
        river: { icon: '🌊', baseSize: 16 },
        landmark: { icon: '📍', baseSize: 15 },
        destination: { icon: '🎉', baseSize: 20 },
        desert: { icon: '🏜️', baseSize: 15 },
        branch: { icon: '⚔️', baseSize: 17 },
        start: { icon: '🚩', baseSize: 17 }
    },

    init(canvasId) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) {
            console.error('Trail map canvas not found');
            return;
        }
        this.ctx = this.canvas.getContext('2d');
        this.setupEventListeners();
        this.buildMapStructure();
        this.startAnimation();
    },

    setupEventListeners() {
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const x = (e.clientX - rect.left) * (this.canvas.width / rect.width);
            const y = (e.clientY - rect.top) * (this.canvas.height / rect.height);
            
            let found = null;
            for (const node of this.nodes) {
                const dx = x - node.x;
                const dy = y - node.y;
                if (Math.sqrt(dx * dx + dy * dy) < node.size + 8) {
                    found = node;
                    break;
                }
            }
            
            if (found !== this.hoveredNode) {
                this.hoveredNode = found;
                this.canvas.style.cursor = found ? 'pointer' : 'default';
            }
        });

        this.canvas.addEventListener('mouseleave', () => {
            this.hoveredNode = null;
        });
    },

    buildMapStructure() {
        this.nodes = [];
        this.connections = [];
        
        const W = this.canvas.width;
        const H = this.canvas.height;
        const centerX = W / 2;
        const topMargin = 80;
        const bottomMargin = 70;
        
        // Total trail distance for positioning
        const totalDist = 2000;
        
        // Helper to convert distance to Y position (bottom = start, top = end)
        const distToY = (dist) => {
            const usableHeight = H - topMargin - bottomMargin;
            return H - bottomMargin - (dist / totalDist) * usableHeight;
        };
        
        // Get current game state
        const currentDist = (typeof gameState !== 'undefined') ? (gameState.distance || 0) : 0;
        const visitedLandmarks = (typeof gameState !== 'undefined') ? (gameState.visitedLandmarks || []) : [];
        const routeHistory = (typeof gameState !== 'undefined') ? (gameState.routeHistory || []) : [];
        const currentRoute = (typeof gameState !== 'undefined') ? (gameState.currentRoute || 'main') : 'main';
        
        // Check which branches have been decided
        const subletteBranch = routeHistory.find(r => r.branchId === 'sublette');
        const californiaBranch = routeHistory.find(r => r.branchId === 'california');
        const barlowBranch = routeHistory.find(r => r.branchId === 'barlow');
        
        // ========== BUILD THE MAP STRUCTURE ==========
        
        // Starting point
        const startNode = this.createNode('start', 'Independence, MO', 0, centerX, distToY(0), 'start', currentDist, visitedLandmarks);
        this.nodes.push(startNode);
        
        // === SECTION 1: Base landmarks (linear path to first branch) ===
        const baseNodes = [];
        const baseLandmarksData = [
            { name: "Kansas River Crossing", distance: 102, type: "river" },
            { name: "Big Blue River Crossing", distance: 185, type: "river" },
            { name: "Fort Kearney", distance: 304, type: "fort" },
            { name: "Chimney Rock", distance: 554, type: "landmark" },
            { name: "Fort Laramie", distance: 640, type: "fort" },
            { name: "Independence Rock", distance: 830, type: "landmark" },
            { name: "South Pass", distance: 932, type: "landmark" }
        ];
        
        let prevNode = startNode;
        baseLandmarksData.forEach((lm, i) => {
            const node = this.createNode(`base_${i}`, lm.name, lm.distance, centerX, distToY(lm.distance), lm.type, currentDist, visitedLandmarks);
            this.nodes.push(node);
            this.connections.push({ from: prevNode, to: node });
            prevNode = node;
            baseNodes.push(node);
        });
        
        // === BRANCH POINT 1: Parting of the Ways (980 miles) ===
        const branchPoint1 = this.createNode('branch1', 'Parting of the Ways', 980, centerX, distToY(980), 'branch', currentDist, visitedLandmarks);
        branchPoint1.isBranchPoint = true;
        branchPoint1.branchId = 'sublette';
        this.nodes.push(branchPoint1);
        this.connections.push({ from: prevNode, to: branchPoint1 });
        
        // === BRANCH 1 OPTIONS ===
        const branchSpread = 100;
        
        // Fort Bridger Route (left branch)
        const fortBridgerLandmarks = [
            { name: "Fort Bridger", distance: 1025, type: "fort" },
            { name: "Bear River Crossing", distance: 1100, type: "river" },
            { name: "Soda Springs", distance: 1180, type: "landmark" }
        ];
        
        const fortBridgerNodes = [];
        let fbPrev = branchPoint1;
        fortBridgerLandmarks.forEach((lm, i) => {
            const xOffset = -branchSpread + (i * 20); // Curve back toward center
            const node = this.createNode(`fb_${i}`, lm.name, lm.distance, centerX + xOffset, distToY(lm.distance), lm.type, currentDist, visitedLandmarks);
            node.branch = 'fortBridger';
            node.branchId = 'sublette';
            // Dim if not chosen and branch is decided
            if (subletteBranch && subletteBranch.optionId !== 'fortBridger') {
                node.dimmed = true;
            }
            this.nodes.push(node);
            this.connections.push({ from: fbPrev, to: node, branch: 'fortBridger', branchId: 'sublette' });
            fbPrev = node;
            fortBridgerNodes.push(node);
        });
        
        // Sublette Cutoff (right branch)
        const subletteLandmarks = [
            { name: "Sublette Flat", distance: 1000, type: "landmark" },
            { name: "Dry Sandy Crossing", distance: 1050, type: "desert" },
            { name: "Green River (West)", distance: 1120, type: "river" }
        ];
        
        const subletteNodes = [];
        let scPrev = branchPoint1;
        subletteLandmarks.forEach((lm, i) => {
            const xOffset = branchSpread - (i * 20); // Curve back toward center
            const node = this.createNode(`sc_${i}`, lm.name, lm.distance, centerX + xOffset, distToY(lm.distance), lm.type, currentDist, visitedLandmarks);
            node.branch = 'subletteCutoff';
            node.branchId = 'sublette';
            if (subletteBranch && subletteBranch.optionId !== 'subletteCutoff') {
                node.dimmed = true;
            }
            this.nodes.push(node);
            this.connections.push({ from: scPrev, to: node, branch: 'subletteCutoff', branchId: 'sublette' });
            scPrev = node;
            subletteNodes.push(node);
        });
        
        // === REJOIN at Fort Hall (1288 miles) ===
        const fortHall = this.createNode('fortHall', 'Fort Hall', 1288, centerX, distToY(1288), 'fort', currentDist, visitedLandmarks);
        this.nodes.push(fortHall);
        // Connect both branches to Fort Hall
        this.connections.push({ from: fbPrev, to: fortHall, branch: 'fortBridger', branchId: 'sublette' });
        this.connections.push({ from: scPrev, to: fortHall, branch: 'subletteCutoff', branchId: 'sublette' });
        
        // === BRANCH POINT 2: California Trail Junction (1300 miles) ===
        const branchPoint2 = this.createNode('branch2', 'California Trail Junction', 1300, centerX, distToY(1300), 'branch', currentDist, visitedLandmarks);
        branchPoint2.isBranchPoint = true;
        branchPoint2.branchId = 'california';
        this.nodes.push(branchPoint2);
        this.connections.push({ from: fortHall, to: branchPoint2 });
        
        // === BRANCH 2 OPTIONS ===
        
        // Oregon Trail (left branch)
        const oregonLandmarks = [
            { name: "Snake River Crossing", distance: 1430, type: "river" },
            { name: "Fort Boise", distance: 1543, type: "fort" }
        ];
        
        let orPrev = branchPoint2;
        oregonLandmarks.forEach((lm, i) => {
            const xOffset = -branchSpread * 0.7;
            const node = this.createNode(`or_${i}`, lm.name, lm.distance, centerX + xOffset, distToY(lm.distance), lm.type, currentDist, visitedLandmarks);
            node.branch = 'oregonTrail';
            node.branchId = 'california';
            if (californiaBranch && californiaBranch.optionId !== 'oregonTrail') {
                node.dimmed = true;
            }
            this.nodes.push(node);
            this.connections.push({ from: orPrev, to: node, branch: 'oregonTrail', branchId: 'california' });
            orPrev = node;
        });
        
        // California Trail (right branch)
        const californiaLandmarks = [
            { name: "Raft River", distance: 1350, type: "river" },
            { name: "City of Rocks", distance: 1420, type: "landmark" },
            { name: "Humboldt River", distance: 1520, type: "river" }
        ];
        
        let caPrev = branchPoint2;
        californiaLandmarks.forEach((lm, i) => {
            const xOffset = branchSpread * 0.7;
            const node = this.createNode(`ca_${i}`, lm.name, lm.distance, centerX + xOffset, distToY(lm.distance), lm.type, currentDist, visitedLandmarks);
            node.branch = 'californiaTrail';
            node.branchId = 'california';
            if (californiaBranch && californiaBranch.optionId !== 'californiaTrail') {
                node.dimmed = true;
            }
            this.nodes.push(node);
            this.connections.push({ from: caPrev, to: node, branch: 'californiaTrail', branchId: 'california' });
            caPrev = node;
        });
        
        // === OREGON PATH CONTINUES ===
        
        // Blue Mountains (only on Oregon route)
        const blueMountains = this.createNode('blueMtn', 'Blue Mountains', 1700, centerX - branchSpread * 0.5, distToY(1700), 'landmark', currentDist, visitedLandmarks);
        blueMountains.branch = 'oregonTrail';
        if (currentRoute === 'californiaTrail') blueMountains.dimmed = true;
        if (californiaBranch && californiaBranch.optionId !== 'oregonTrail') blueMountains.dimmed = true;
        this.nodes.push(blueMountains);
        this.connections.push({ from: orPrev, to: blueMountains, branch: 'oregonTrail', branchId: 'california' });
        
        // === BRANCH POINT 3: Cascade Range (1800 miles) - Oregon route only ===
        const branchPoint3 = this.createNode('branch3', 'Cascade Range', 1800, centerX - branchSpread * 0.3, distToY(1800), 'branch', currentDist, visitedLandmarks);
        branchPoint3.isBranchPoint = true;
        branchPoint3.branchId = 'barlow';
        branchPoint3.branch = 'oregonTrail';
        if (currentRoute === 'californiaTrail') branchPoint3.dimmed = true;
        if (californiaBranch && californiaBranch.optionId !== 'oregonTrail') branchPoint3.dimmed = true;
        this.nodes.push(branchPoint3);
        this.connections.push({ from: blueMountains, to: branchPoint3, branch: 'oregonTrail' });
        
        // Barlow Road (left sub-branch)
        const barlowLandmarks = [
            { name: "Barlow Pass", distance: 1880, type: "landmark" },
            { name: "Mount Hood View", distance: 1930, type: "landmark" }
        ];
        
        let barPrev = branchPoint3;
        barlowLandmarks.forEach((lm, i) => {
            const xOffset = -branchSpread * 0.6;
            const node = this.createNode(`bar_${i}`, lm.name, lm.distance, centerX + xOffset, distToY(lm.distance), lm.type, currentDist, visitedLandmarks);
            node.branch = 'barlowRoad';
            node.branchId = 'barlow';
            if (currentRoute === 'californiaTrail') node.dimmed = true;
            if (californiaBranch && californiaBranch.optionId !== 'oregonTrail') node.dimmed = true;
            if (barlowBranch && barlowBranch.optionId !== 'barlowRoad') node.dimmed = true;
            this.nodes.push(node);
            this.connections.push({ from: barPrev, to: node, branch: 'barlowRoad', branchId: 'barlow' });
            barPrev = node;
        });
        
        // Columbia River (right sub-branch of Oregon route)
        const columbiaLandmarks = [
            { name: "The Dalles", distance: 1850, type: "landmark" },
            { name: "Columbia River Rapids", distance: 1900, type: "river" },
            { name: "Cascade Portage", distance: 1950, type: "landmark" }
        ];
        
        let colPrev = branchPoint3;
        columbiaLandmarks.forEach((lm, i) => {
            const xOffset = branchSpread * 0.2;
            const node = this.createNode(`col_${i}`, lm.name, lm.distance, centerX + xOffset, distToY(lm.distance), lm.type, currentDist, visitedLandmarks);
            node.branch = 'columbiaRiver';
            node.branchId = 'barlow';
            if (currentRoute === 'californiaTrail') node.dimmed = true;
            if (californiaBranch && californiaBranch.optionId !== 'oregonTrail') node.dimmed = true;
            if (barlowBranch && barlowBranch.optionId !== 'columbiaRiver') node.dimmed = true;
            this.nodes.push(node);
            this.connections.push({ from: colPrev, to: node, branch: 'columbiaRiver', branchId: 'barlow' });
            colPrev = node;
        });
        
        // Oregon City destination
        const oregonCity = this.createNode('oregonCity', 'Oregon City', 2000, centerX - branchSpread * 0.4, distToY(2000), 'destination', currentDist, visitedLandmarks);
        oregonCity.branch = 'oregonTrail';
        if (currentRoute === 'californiaTrail') oregonCity.dimmed = true;
        if (californiaBranch && californiaBranch.optionId !== 'oregonTrail') oregonCity.dimmed = true;
        this.nodes.push(oregonCity);
        this.connections.push({ from: barPrev, to: oregonCity, branch: 'barlowRoad', branchId: 'barlow' });
        this.connections.push({ from: colPrev, to: oregonCity, branch: 'columbiaRiver', branchId: 'barlow' });
        
        // === CALIFORNIA PATH CONTINUES ===
        const californiaEndLandmarks = [
            { name: "Truckee Pass", distance: 1750, type: "landmark" },
            { name: "Sacramento Valley", distance: 1900, type: "landmark" },
            { name: "Sacramento", distance: 2000, type: "destination" }
        ];
        
        californiaEndLandmarks.forEach((lm, i) => {
            const xOffset = branchSpread * 0.7;
            const node = this.createNode(`caEnd_${i}`, lm.name, lm.distance, centerX + xOffset, distToY(lm.distance), lm.type, currentDist, visitedLandmarks);
            node.branch = 'californiaTrail';
            node.branchId = 'california';
            if (californiaBranch && californiaBranch.optionId !== 'californiaTrail') {
                node.dimmed = true;
            }
            this.nodes.push(node);
            this.connections.push({ from: caPrev, to: node, branch: 'californiaTrail', branchId: 'california' });
            caPrev = node;
        });
    },
    
    createNode(id, name, distance, x, y, type, currentDist, visitedLandmarks) {
        const nodeType = this.nodeTypes[type] || this.nodeTypes.landmark;
        const isVisited = visitedLandmarks.includes(name) || distance < currentDist;
        const isCurrent = distance >= currentDist && distance < currentDist + 100;
        
        return {
            id,
            name,
            distance,
            x,
            y,
            type,
            size: nodeType.baseSize,
            visited: isVisited,
            current: isCurrent && !isVisited,
            dimmed: false,
            branch: null,
            branchId: null,
            isBranchPoint: false
        };
    },
    
    startAnimation() {
        const animate = () => {
            if (document.getElementById('visualMapOverlay').style.display !== 'none') {
                this.render();
                this.animationFrame = requestAnimationFrame(animate);
            }
        };
        animate();
    },
    
    stopAnimation() {
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }
    },

    render() {
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;
        
        // Draw background
        this.drawBackground();
        
        // Draw decorative elements
        this.drawDecorations();
        
        // Draw connections (paths) - draw dimmed ones first
        this.connections.filter(c => this.isConnectionDimmed(c)).forEach(conn => {
            this.drawPath(conn);
        });
        this.connections.filter(c => !this.isConnectionDimmed(c)).forEach(conn => {
            this.drawPath(conn);
        });
        
        // Draw nodes - draw dimmed ones first
        this.nodes.filter(n => n.dimmed).forEach(node => {
            this.drawNode(node);
        });
        this.nodes.filter(n => !n.dimmed).forEach(node => {
            this.drawNode(node);
        });
        
        // Draw tooltip for hovered node
        if (this.hoveredNode) {
            this.drawTooltip(this.hoveredNode);
        }
        
        // Draw "Main Menu" text
        this.drawMainMenu();
    },
    
    isConnectionDimmed(conn) {
        return conn.from.dimmed || conn.to.dimmed;
    },
    
    drawBackground() {
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;
        
        // Base brown background with gradient
        const gradient = ctx.createRadialGradient(w/2, h/2, 0, w/2, h/2, w * 0.7);
        gradient.addColorStop(0, '#6b5a42');
        gradient.addColorStop(0.5, '#5c4a32');
        gradient.addColorStop(1, '#4a3a28');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, w, h);
        
        // Subtle texture
        ctx.globalAlpha = 0.03;
        for (let i = 0; i < 150; i++) {
            const x = Math.random() * w;
            const y = Math.random() * h;
            const size = Math.random() * 2 + 1;
            ctx.fillStyle = Math.random() > 0.5 ? '#3a2a1a' : '#7a6a5a';
            ctx.fillRect(x, y, size, size);
        }
        ctx.globalAlpha = 1;
    },
    
    drawDecorations() {
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;
        
        // Corner vines
        ctx.strokeStyle = '#2d4a1f';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        
        this.drawVine(0, 0, 1, 1, 100);
        this.drawVine(w, 0, -1, 1, 100);
        this.drawVine(0, h, 1, -1, 80);
        this.drawVine(w, h, -1, -1, 80);
    },
    
    drawVine(startX, startY, dirX, dirY, length) {
        const ctx = this.ctx;
        
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        
        let x = startX, y = startY;
        for (let i = 0; i < 3; i++) {
            const segLen = length / 3;
            const endX = x + dirX * segLen;
            const endY = y + dirY * segLen * 0.7;
            const ctrlX = x + dirX * segLen * 0.6;
            const ctrlY = y + dirY * segLen * 0.3;
            ctx.quadraticCurveTo(ctrlX, ctrlY, endX, endY);
            x = endX;
            y = endY;
        }
        ctx.stroke();
        
        // Leaves
        ctx.fillStyle = '#3d6a2f';
        for (let i = 0; i < 3; i++) {
            const lx = startX + dirX * (25 + i * 30);
            const ly = startY + dirY * (20 + i * 15);
            ctx.beginPath();
            ctx.ellipse(lx, ly, 7, 3, Math.atan2(dirY, dirX), 0, Math.PI * 2);
            ctx.fill();
        }
    },
    
    drawPath(conn) {
        const ctx = this.ctx;
        const { from, to } = conn;
        const dimmed = this.isConnectionDimmed(conn);
        const visited = from.visited && to.visited && !dimmed;
        
        // Calculate curve
        const midX = (from.x + to.x) / 2;
        const midY = (from.y + to.y) / 2;
        const dx = to.x - from.x;
        const perpX = -(to.y - from.y) * 0.12;
        
        const ctrlX = midX + perpX;
        const ctrlY = midY;
        
        if (dimmed) {
            ctx.globalAlpha = 0.3;
        }
        
        // Glow for visited paths
        if (visited && !dimmed) {
            ctx.strokeStyle = 'rgba(81, 207, 102, 0.4)';
            ctx.lineWidth = 12;
            ctx.beginPath();
            ctx.moveTo(from.x, from.y);
            ctx.quadraticCurveTo(ctrlX, ctrlY, to.x, to.y);
            ctx.stroke();
        }
        
        // Path border
        ctx.strokeStyle = visited ? '#3d7a3d' : this.colors.pathStroke;
        ctx.lineWidth = 9;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.quadraticCurveTo(ctrlX, ctrlY, to.x, to.y);
        ctx.stroke();
        
        // Main path
        ctx.strokeStyle = visited ? this.colors.pathVisited : this.colors.pathDefault;
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.quadraticCurveTo(ctrlX, ctrlY, to.x, to.y);
        ctx.stroke();
        
        ctx.globalAlpha = 1;
    },
    
    drawNode(node) {
        const ctx = this.ctx;
        const { x, y, size, visited, current, type, dimmed, isBranchPoint } = node;
        const isHovered = this.hoveredNode === node;
        const nodeType = this.nodeTypes[type] || this.nodeTypes.landmark;
        
        if (dimmed) {
            ctx.globalAlpha = 0.35;
        }
        
        // Determine colors
        let fillColor, strokeColor;
        if (isBranchPoint) {
            fillColor = this.colors.branchPoint;
            strokeColor = '#7b3996';
        } else if (current && !dimmed) {
            fillColor = this.colors.nodeCurrent;
            strokeColor = '#a07a10';
        } else if (visited && !dimmed) {
            fillColor = this.colors.nodeVisited;
            strokeColor = '#2d7a2d';
        } else {
            fillColor = this.colors.nodeUpcoming;
            strokeColor = '#2a6a2a';
        }
        
        const actualSize = size + (isHovered ? 4 : 0);
        
        // Glow effect
        if ((current || isHovered) && !dimmed) {
            ctx.shadowColor = current ? this.colors.nodeCurrent : fillColor;
            ctx.shadowBlur = current ? 20 : 12;
        }
        
        // Draw shape based on type
        ctx.fillStyle = fillColor;
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 3;
        
        this.drawNodeShape(x, y, actualSize, type, isBranchPoint);
        
        ctx.shadowBlur = 0;
        
        // Draw icon
        ctx.font = `${actualSize * 1.1}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = dimmed ? 'rgba(255,255,255,0.7)' : 'white';
        ctx.fillText(nodeType.icon, x, y);
        
        // Pulsing ring for current node
        if (current && !dimmed) {
            const pulse = (Math.sin(Date.now() / 250) + 1) / 2;
            ctx.strokeStyle = this.colors.nodeCurrent;
            ctx.lineWidth = 2;
            ctx.globalAlpha = 0.6 - pulse * 0.4;
            ctx.beginPath();
            ctx.arc(x, y, actualSize + 8 + pulse * 10, 0, Math.PI * 2);
            ctx.stroke();
        }
        
        ctx.globalAlpha = 1;
    },
    
    drawNodeShape(x, y, size, type, isBranchPoint) {
        const ctx = this.ctx;
        ctx.beginPath();
        
        if (isBranchPoint) {
            // Hexagon for branch points
            for (let i = 0; i < 6; i++) {
                const angle = (i * 60 - 30) * Math.PI / 180;
                const px = x + size * Math.cos(angle);
                const py = y + size * Math.sin(angle);
                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
        } else if (type === 'fort') {
            // Hexagon
            for (let i = 0; i < 6; i++) {
                const angle = (i * 60 - 30) * Math.PI / 180;
                const px = x + size * Math.cos(angle);
                const py = y + size * Math.sin(angle);
                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
        } else if (type === 'river') {
            // Diamond
            ctx.moveTo(x, y - size);
            ctx.lineTo(x + size * 0.85, y);
            ctx.lineTo(x, y + size);
            ctx.lineTo(x - size * 0.85, y);
        } else if (type === 'destination') {
            // Star
            for (let i = 0; i < 10; i++) {
                const angle = (i * 36 - 90) * Math.PI / 180;
                const r = i % 2 === 0 ? size : size * 0.5;
                const px = x + r * Math.cos(angle);
                const py = y + r * Math.sin(angle);
                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
        } else {
            // Pentagon for landmarks
            for (let i = 0; i < 5; i++) {
                const angle = (i * 72 - 90) * Math.PI / 180;
                const px = x + size * Math.cos(angle);
                const py = y + size * Math.sin(angle);
                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
        }
        
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
    },
    
    drawTooltip(node) {
        const ctx = this.ctx;
        const padding = 10;
        const { x, y, name, distance, visited, current, size, dimmed, branch } = node;
        
        const lines = [name];
        lines.push(`${distance} miles`);
        if (dimmed) {
            lines.push('(Alternate route)');
        } else if (visited) {
            lines.push('✓ Visited');
        } else if (current) {
            lines.push('► Next Stop');
        } else {
            lines.push('Upcoming');
        }
        
        ctx.font = 'bold 12px "Courier New", monospace';
        const maxWidth = Math.max(...lines.map(l => ctx.measureText(l).width));
        const boxWidth = maxWidth + padding * 2;
        const boxHeight = lines.length * 16 + padding * 2;
        
        let tooltipX = x - boxWidth / 2;
        let tooltipY = y - size - boxHeight - 12;
        
        if (tooltipX < 10) tooltipX = 10;
        if (tooltipX + boxWidth > this.canvas.width - 10) tooltipX = this.canvas.width - boxWidth - 10;
        if (tooltipY < 10) tooltipY = y + size + 12;
        
        // Background
        ctx.fillStyle = 'rgba(26, 15, 8, 0.95)';
        ctx.strokeStyle = '#8b6914';
        ctx.lineWidth = 2;
        
        ctx.beginPath();
        ctx.roundRect(tooltipX, tooltipY, boxWidth, boxHeight, 5);
        ctx.fill();
        ctx.stroke();
        
        // Text
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        
        lines.forEach((line, i) => {
            if (i === 0) {
                ctx.fillStyle = '#ffd700';
                ctx.font = 'bold 12px "Courier New", monospace';
            } else if (i === 2) {
                ctx.fillStyle = dimmed ? '#888' : (visited ? '#51cf66' : (current ? '#ffd700' : '#8b7355'));
                ctx.font = '11px "Courier New", monospace';
            } else {
                ctx.fillStyle = '#b8a88a';
                ctx.font = '11px "Courier New", monospace';
            }
            ctx.fillText(line, tooltipX + padding, tooltipY + padding + i * 16);
        });
    },
    
    drawMainMenu() {
        const ctx = this.ctx;
        
        ctx.font = 'italic 18px "IM Fell English", "Times New Roman", serif';
        ctx.fillStyle = '#c9b896';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'bottom';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
        ctx.shadowBlur = 4;
        ctx.fillText('Main Menu', 15, this.canvas.height - 12);
        ctx.shadowBlur = 0;
    },
    
    refresh() {
        this.buildMapStructure();
    }
};

// Show/hide functions
function showVisualMap() {
    const overlay = document.getElementById('visualMapOverlay');
    if (overlay) {
        overlay.style.display = 'flex';
        TrailMapCanvas.init('trailMapCanvas');
    }
}

function closeVisualMap() {
    const overlay = document.getElementById('visualMapOverlay');
    if (overlay) {
        overlay.style.display = 'none';
        TrailMapCanvas.stopAnimation();
    }
}

// Event listeners
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const overlay = document.getElementById('visualMapOverlay');
        if (overlay && overlay.style.display !== 'none') {
            closeVisualMap();
        }
    }
});

document.addEventListener('click', (e) => {
    const overlay = document.getElementById('visualMapOverlay');
    if (e.target === overlay) {
        closeVisualMap();
    }
});

// Export
if (typeof window !== 'undefined') {
    window.TrailMapCanvas = TrailMapCanvas;
    window.showVisualMap = showVisualMap;
    window.closeVisualMap = closeVisualMap;
}