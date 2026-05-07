'use strict';
'require view';
'require poll';
'require ui';

/* global speedtest_luci */

return view.extend({

	/* ------------------------------------------------------------------ */
	/* State                                                                */
	/* ------------------------------------------------------------------ */
	_running: false,
	_lines:   [],

	/* ------------------------------------------------------------------ */
	/* Render the initial static shell                                      */
	/* ------------------------------------------------------------------ */
	render: function() {
		var self = this;

		var node = E('div', { 'class': 'st-wrap' }, [

			/* Inline styles */
			E('style', {}, [`
				@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&family=DM+Sans:wght@300;400;500&display=swap');

				.st-wrap * { box-sizing: border-box; }
				.st-wrap {
					--accent:  #00e5a0;
					--accent2: #0099ff;
					--warn:    #f0a500;
					--danger:  #ff4d6d;
					--mono:    'JetBrains Mono', 'Courier New', monospace;
					--sans:    'DM Sans', system-ui, sans-serif;
					font-family: var(--sans);
					padding: 0 0 2rem 0;
					color: inherit;
				}

				/* Header */
				.st-header { display:flex; align-items:center; gap:1rem; margin-bottom:2rem; }
				.st-logo {
					width:44px; height:44px;
					background: linear-gradient(135deg, #00e5a0, #0099ff);
					border-radius:12px;
					display:flex; align-items:center; justify-content:center;
					font-size:1.4rem; flex-shrink:0;
				}
				.st-title { font-family:var(--mono); font-size:1.2rem; font-weight:700; margin:0; }
				.st-subtitle { font-size:0.78rem; opacity:0.55; margin:0.15rem 0 0; font-weight:300; }

				/* Phase bar */
				.st-phases { display:flex; gap:0.35rem; margin-bottom:1.5rem; }
				.st-phase-col { flex:1; }
				.st-phase-bar {
					height:3px; border-radius:2px;
					background: rgba(128,128,128,0.25);
					transition: background 0.4s;
				}
				.st-phase-bar.ph-active { background:#0099ff; animation:ph-pulse 1s ease-in-out infinite; }
				.st-phase-bar.ph-done   { background:#00e5a0; }
				.st-phase-lbl { font-size:0.62rem; opacity:0.45; font-family:var(--mono); margin-top:5px; }

				@keyframes ph-pulse { 0%,100%{opacity:1} 50%{opacity:.35} }

				/* Cards */
				.st-cards {
					display:grid;
					grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
					gap:1rem; margin-bottom:1.5rem;
				}
				.st-card {
					border: 1px solid rgba(128,128,128,0.2);
					border-radius:12px; padding:1.1rem 1.3rem;
					position:relative; overflow:hidden;
					transition: border-color 0.3s;
					background: rgba(128,128,128,0.05);
				}
				.st-card::before {
					content:''; position:absolute; top:0; left:0; right:0; height:2px;
					background:transparent; transition:background 0.3s;
				}
				.st-card.c-active { border-color:#0099ff; }
				.st-card.c-active::before { background:#0099ff; animation:ph-pulse 1s ease-in-out infinite; }
				.st-card.c-done   { border-color:#00e5a0; }
				.st-card.c-done::before   { background:#00e5a0; }
				.st-card.c-warn   { border-color:#f0a500; }
				.st-card.c-warn::before   { background:#f0a500; }

				.st-card-lbl { font-size:0.68rem; font-weight:500; text-transform:uppercase; letter-spacing:.1em; opacity:.5; margin-bottom:.4rem; }
				.st-card-val {
					font-family:var(--mono); font-size:1.9rem; font-weight:700;
					line-height:1; min-height:2.3rem; transition:color 0.3s;
				}
				.st-card.c-done   .st-card-val { color:#00e5a0; }
				.st-card.c-active .st-card-val { color:#0099ff; }
				.st-card.c-warn   .st-card-val { color:#f0a500; }
				.st-card-unit { font-size:0.7rem; opacity:.45; font-family:var(--mono); }
				.st-card-sub  { font-size:0.66rem; opacity:.45; font-family:var(--mono); margin-top:.35rem; line-height:1.5; min-height:1.8rem; }

				/* Button */
				.st-btn {
					font-family:var(--mono); font-size:0.82rem; font-weight:600;
					letter-spacing:.05em; padding:.7rem 1.8rem; border-radius:8px;
					border:none; cursor:pointer; display:inline-flex; align-items:center;
					gap:.5rem; margin-bottom:1.5rem; transition:all .2s;
					background:#00e5a0; color:#0d1117;
				}
				.st-btn:hover:not(:disabled) { filter:brightness(1.15); transform:translateY(-1px); }
				.st-btn:disabled { background:rgba(128,128,128,0.2); color:rgba(128,128,128,0.5); cursor:not-allowed; }

				/* Log */
				.st-log-wrap { border:1px solid rgba(128,128,128,0.2); border-radius:12px; overflow:hidden; }
				.st-log-hdr {
					padding:.6rem 1.1rem; border-bottom:1px solid rgba(128,128,128,0.15);
					font-size:.7rem; font-family:var(--mono); opacity:.5;
					text-transform:uppercase; letter-spacing:.08em;
					display:flex; align-items:center; gap:.5rem;
				}
				.st-log-dot { width:6px; height:6px; border-radius:50%; background:rgba(128,128,128,.3); transition:background .3s; }
				.st-log-dot.running { background:#00e5a0; animation:ph-pulse 1s ease-in-out infinite; }
				.st-log-body {
					padding:.9rem 1.1rem; font-family:var(--mono); font-size:.76rem;
					line-height:1.8; min-height:5rem; max-height:15rem; overflow-y:auto;
					opacity:.75;
				}
				.st-log-line { display:flex; gap:.7rem; }
				.st-log-line.l-ok   { opacity:1; }
				.st-log-line.l-info { color:#0099ff; opacity:1; }
				.st-log-icon { flex-shrink:0; }
				.st-idle { opacity:.4; font-style:italic; }
			`]),

			/* Header */
			E('div', { 'class': 'st-header' }, [
				E('div', { 'class': 'st-logo' }, '⚡'),
				E('div', {}, [
					E('p', { 'class': 'st-title' }, 'Network Speed Test'),
					E('p', { 'class': 'st-subtitle' }, 'powered by speedtest-go'),
				])
			]),

			/* Phase progress bar */
			E('div', { 'class': 'st-phases', 'id': 'st-phases' }, [
				self._phaseCol('ph-latency',    'Latency'),
				self._phaseCol('ph-download',   'Download'),
				self._phaseCol('ph-upload',     'Upload'),
				self._phaseCol('ph-packetloss', 'Pkt Loss'),
			]),

			/* Metric cards */
			E('div', { 'class': 'st-cards' }, [
				self._card('latency',  'Latency',     'ms avg',  'jitter / min / max'),
				self._card('download', 'Download',    'Mbps',    'latency under load'),
				self._card('upload',   'Upload',      'Mbps',    'latency under load'),
				self._card('pl',       'Packet Loss', '%',       'sent / dup / max'),
			]),

			/* Run button */
			E('button', {
				'class': 'st-btn', 'id': 'st-btn',
				'click': function() { self._startTest(); }
			}, [ '▶  Run Speed Test' ]),

			/* Log */
			E('div', { 'class': 'st-log-wrap' }, [
				E('div', { 'class': 'st-log-hdr' }, [
					E('div', { 'class': 'st-log-dot', 'id': 'st-log-dot' }),
					'Raw Output'
				]),
				E('div', { 'class': 'st-log-body', 'id': 'st-log' },
					E('span', { 'class': 'st-idle' }, 'Press "Run Speed Test" to begin…')
				)
			])
		]);

		return node;
	},

	/* ------------------------------------------------------------------ */
	/* Helpers to build DOM fragments                                       */
	/* ------------------------------------------------------------------ */
	_phaseCol: function(id, label) {
		return E('div', { 'class': 'st-phase-col' }, [
			E('div', { 'class': 'st-phase-bar', 'id': id }),
			E('div', { 'class': 'st-phase-lbl' }, label),
		]);
	},

	_card: function(id, label, unit, sub) {
		return E('div', { 'class': 'st-card', 'id': 'card-' + id }, [
			E('div', { 'class': 'st-card-lbl' }, label),
			E('div', { 'class': 'st-card-val', 'id': 'val-' + id }, '—'),
			E('div', { 'class': 'st-card-unit' }, unit),
			E('div', { 'class': 'st-card-sub', 'id': 'sub-' + id }, sub),
		]);
	},

	/* ------------------------------------------------------------------ */
	/* CGI interaction                                                      */
	/* ------------------------------------------------------------------ */
	_startTest: function() {
		var self = this;
		if (self._running) return;

		self._resetUI();
		self._running = true;
		self._lines = [];

		fetch('/cgi-bin/speedtest-run?action=start')
			.then(function(r) { return r.json(); })
			.then(function(d) {
				if (d.status === 'started') {
					setTimeout(function() { self._poll(); }, 1500);
				}
			})
			.catch(function(e) {
				self._logError('Could not reach CGI backend: ' + e);
				self._finishUI();
			});
	},

	_poll: function() {
		var self = this;

		fetch('/cgi-bin/speedtest-run?action=poll')
			.then(function(r) { return r.json(); })
			.then(function(d) {
				if (d.lines && d.lines.length) {
					d.lines.forEach(function(l) { self._parseLine(l); });
					self._renderLog(d.lines);
				}
				if (d.status === 'true' || d.status === true) {
					setTimeout(function() { self._poll(); }, 1500);
				} else {
					self._running = false;
					self._finishUI();
				}
			})
			.catch(function() {
				setTimeout(function() { self._poll(); }, 2000);
			});
	},

	/* ------------------------------------------------------------------ */
	/* Line parsing -> card updates                                         */
	/* ------------------------------------------------------------------ */
	_parseLine: function(line) {
		var m;

		// Latency line
		m = line.match(/Latency:\s*([\d.]+)ms\s+Jitter:\s*([\d.]+)ms\s+Min:\s*([\d.]+)ms\s+Max:\s*([\d.]+)ms/);
		if (m) {
			this._setPhase('ph-latency',  'ph-done');
			this._setPhase('ph-download', 'ph-active');
			this._setCard('latency', 'c-done');
			this._setCard('download', 'c-active');
			this._setText('val-latency', parseFloat(m[1]).toFixed(1));
			this._setText('sub-latency',
				'jitter ' + parseFloat(m[2]).toFixed(1) + 'ms  ' +
				'min '    + parseFloat(m[3]).toFixed(1) + '  ' +
				'max '    + parseFloat(m[4]).toFixed(1));
		}

		// Completed download
		m = line.match(/Download:\s*([\d.]+)\s*Mbps.*Latency:\s*([\d.]+)ms\s+Jitter:\s*([\d.]+)ms\s+Min:\s*([\d.]+)ms\s+Max:\s*([\d.]+)ms/);
		if (m) {
			var maxMs = parseInt(m[5]);
			var bloat = maxMs > 100 ? ' ⚠ bufferbloat' : '';
			this._setPhase('ph-download', 'ph-done');
			this._setPhase('ph-upload',   'ph-active');
			this._setCard('download', bloat ? 'c-warn' : 'c-done');
			this._setCard('upload', 'c-active');
			this._setText('val-download', parseFloat(m[1]).toFixed(1));
			this._setText('sub-download',
				'lat ' + m[2] + 'ms  jitter ' + m[3] + 'ms  max ' + m[5] + 'ms' + bloat);
		}

		// Completed upload
		m = line.match(/Upload:\s*([\d.]+)\s*Mbps.*Latency:\s*([\d.]+)ms\s+Jitter:\s*([\d.]+)ms\s+Min:\s*([\d.]+)ms\s+Max:\s*([\d.]+)ms/);
		if (m) {
			this._setPhase('ph-upload',     'ph-done');
			this._setPhase('ph-packetloss', 'ph-active');
			this._setCard('upload', 'c-done');
			this._setCard('pl', 'c-active');
			this._setText('val-upload', parseFloat(m[1]).toFixed(1));
			this._setText('sub-upload',
				'lat ' + m[2] + 'ms  jitter ' + m[3] + 'ms  max ' + m[5] + 'ms');
		}

		// Packet loss - numeric result
		m = line.match(/Packet Loss:\s*([\d.]+)%.*Sent:\s*(\d+)\/Dup:\s*(\d+)\/Max:\s*(\d+)/);
		if (m) {
			var pct = parseFloat(m[1]);
			this._setPhase('ph-packetloss', 'ph-done');
			this._setCard('pl', pct === 0 ? 'c-done' : 'c-warn');
			this._setText('val-pl', pct.toFixed(2));
			this._setText('sub-pl',
				'sent ' + m[2] + '  dup ' + m[3] + '  max ' + m[4]);
		}

		// Packet loss - N/A (test couldn't measure)
		if (/Packet Loss:\s*N\/A/.test(line)) {
			this._setPhase('ph-packetloss', 'ph-done');
			this._setCard('pl', 'c-done');
			this._setText('val-pl', 'N/A');
			this._setText('sub-pl', 'measurement unavailable');
		}

		// Live download progress (spinner line)
		m = line.match(/Download:\s*([\d.]+)\s*Mbps\s+\(Latency:/);
		if (m && document.getElementById('val-download').textContent === '—') {
			this._setText('val-download', '~' + parseFloat(m[1]).toFixed(1));
		}

		// Live upload progress (spinner line)
		m = line.match(/Upload:\s*([\d.]+)\s*Mbps\s+\(Latency:/);
		if (m && document.getElementById('val-upload').textContent === '—') {
			this._setText('val-upload', '~' + parseFloat(m[1]).toFixed(1));
		}
	},

	/* ------------------------------------------------------------------ */
	/* Log rendering                                                        */
	/* ------------------------------------------------------------------ */
	_renderLog: function(lines) {
		var log = document.getElementById('st-log');
		if (!log) return;
		log.innerHTML = '';
		lines.forEach(function(line) {
			var cls = 'l-plain', icon = '·';
			if (line.indexOf('Download:') >= 0 || line.indexOf('Upload:') >= 0 ||
			    line.indexOf('Latency:')  >= 0 || line.indexOf('Packet Loss:') >= 0 ||
			    line.indexOf('Found')     >= 0 || line.indexOf('ISP:') >= 0 ||
			    line.indexOf('Server:')   >= 0) {
				cls = 'l-ok'; icon = '✓';
			} else if (line.indexOf('speedtest-go') >= 0) {
				cls = 'l-info'; icon = '→';
			}
			var safe = line.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
			var row = E('div', { 'class': 'st-log-line ' + cls }, [
				E('span', { 'class': 'st-log-icon' }, icon),
				E('span', { 'class': 'st-log-text' }, safe)
			]);
			log.appendChild(row);
		});
		log.scrollTop = log.scrollHeight;
	},

	_logError: function(msg) {
		var log = document.getElementById('st-log');
		if (log) log.textContent = 'Error: ' + msg;
	},

	/* ------------------------------------------------------------------ */
	/* UI state helpers                                                     */
	/* ------------------------------------------------------------------ */
	_resetUI: function() {
		var phases = ['ph-latency','ph-download','ph-upload','ph-packetloss'];
		phases.forEach(function(id) {
			var el = document.getElementById(id);
			if (el) el.className = 'st-phase-bar';
		});
		['latency','download','upload','pl'].forEach(function(k) {
			var card = document.getElementById('card-' + k);
			if (card) card.className = 'st-card';
			var val = document.getElementById('val-' + k);
			if (val) val.textContent = '—';
		});
		this._setText('sub-latency',  'jitter / min / max');
		this._setText('sub-download', 'latency under load');
		this._setText('sub-upload',   'latency under load');
		this._setText('sub-pl',       'sent / dup / max');

		var log = document.getElementById('st-log');
		if (log) log.innerHTML = '<span class="st-idle">Starting…</span>';

		var dot = document.getElementById('st-log-dot');
		if (dot) dot.className = 'st-log-dot running';

		var btn = document.getElementById('st-btn');
		if (btn) btn.disabled = true;

		this._setPhase('ph-latency', 'ph-active');
		this._setCard('latency', 'c-active');
	},

	_finishUI: function() {
		var dot = document.getElementById('st-log-dot');
		if (dot) dot.className = 'st-log-dot';
		var btn = document.getElementById('st-btn');
		if (btn) btn.disabled = false;
	},

	_setPhase: function(id, cls) {
		var el = document.getElementById(id);
		if (el) el.className = 'st-phase-bar ' + cls;
	},

	_setCard: function(id, cls) {
		var el = document.getElementById('card-' + id);
		if (el) el.className = 'st-card ' + cls;
	},

	_setText: function(id, text) {
		var el = document.getElementById(id);
		if (el) el.textContent = text;
	},

	handleSaveApply: null,
	handleSave: null,
	handleReset: null,
});
