function launch() {
	var flagsval = document.getElementById('flags').value;
	//flagsval = flagsval.replace(' ','|');
	flagsval = flagsval.replace(new RegExp(' ', 'g'), '|');

	// Get manual objectives and encode them
	var manualObjectivesVal = document.getElementById('manualobjectives').value;
	var encodedObjectives = encodeURIComponent(manualObjectivesVal);

	var itemtracking = '0';
	var loctracking = '0';
	var bosstracking = '0';
	var verticallayout = '0';
	var locationtracking = '0';
	var currentparty = '0';
	var objectivetracking = '0';
	var autotracking = '0';
	var autotrackingport = '0000';
	var browser = '0';
	var characterstracking = '0';

	if (document.getElementById('locswitch').checked) {
		loctracking = '1';
	}

	if (document.getElementById('charswitch').checked) {
		currentparty = '1';
	}

	if (document.getElementById('verticalmodeswitch').checked) {
		verticallayout = '1';
	}

	if (document.getElementById('objswitch').checked) {
		objectivetracking = '1';
	}

	if (document.getElementById('charactersswitch').checked) {
		characterstracking = '1';
	}

	if (document.getElementById('bossswitch').checked) {
		bosstracking = '1';
	}

	if (document.getElementById('autotrackingswitch').checked) {
		autotracking = '1';
		autotrackingport = document.getElementById('autotrackingport').value;
	}
	
	//Chrome defaults - use fixed window size from tracker
	var h = 575;
	var w = 620;
	
	open('tracker.html?f=' + flagsval.toUpperCase() + '&d=' + itemtracking + '&c=' + loctracking + '&s=' + bosstracking + '&l=' + locationtracking + '&v=' + verticallayout + '&h=' + currentparty + '&o=' + objectivetracking + '&a=' + autotracking + autotrackingport + '&b=' + browser + '&m=' + encodedObjectives + '&k=' + characterstracking + '&r=' + Date.now(),
		'',
		'width=' + w + ',height=' + h + ',titlebar=0,menubar=0,toolbar=0,scrollbars=0,resizable=0');
}

function loadflags(f) {
	document.getElementById('flags').value = f;
	window.scrollTo(0, 0);
}