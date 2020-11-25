/**
 * If class as identifier is, you have to reinitialise all select elements.
 * @param {string }selector - id or class name, id: #myID, class: .myClass
 * @param {array} data - as array where the data has to be sorted in which order you like to display them
 */
function fillSelect(selector, data){
	let selectInstance =  M.FormSelect.getInstance($(selector));
	if(selectInstance){
		selectInstance.destroy();
	}

	$(selector).empty();
	$(selector).append('<option vlaue="" selected>Choose</option>');

	for(let d in data){
		$(selector).append('<option vlaue="' + data[d] + '">' + data[d] + '</option>');
	}

	instances = M.FormSelect.init($(selector));
}

/**
 * Add a new element to a Tab selection bar.
 * @param {string} id - Tab selcetion bar id, id must be in ul element where class tabs is
 * @param {string} name - Name of the Tab
 * @param {string} prefix - the prefix for the id of the element, null if not used
 * @param {boolean} addIndex - True to add Index of the tab to the Name
 */
function addTabElement(id, name, prefix, addIndex){
	let tabbarInstance =  M.Tabs.getInstance($(id));
	tabbarInstance.destroy();

	name = name.toLowerCase();

	let index = $(id).children().length + 1;
	if(addIndex === true && prefix !== null){
		$(id).append('<li id="' + prefix + '-' + name + '-' + index + '" class="tab col"><a href="#tab-' + name + '-' + index + '" class="">' + name + ' ' + index + '</a></li>');
		//add body for tab
		$(id).parent().append('<div id="tab-' + name + '-' + index + '" class="col s12 page"></div>');
	}else if(addIndex === true){
		$(id).append('<li id="' + name + '-' + index + '" class="tab col"><a href="#tab-' + name + '-' + index + '" class="">' + name + ' ' + index + '</a></li>');
		//add body for tab
		$(id).parent().append('<div id="tab-' + name + '-' + index + '" class="col s12 page"></div>');
	}else{
		$(id).append('<li id="' + name + '" class="tab col"><a href="#tab-' + name + '" class="">' + name + '</a></li>');
		//add body for tab
		$(id).parent().append('<div id="tab-' + name + '" class="col s12 page"></div>');
	}

	instances = M.Tabs.init($(id));
}

/**
 * Removes the active Tab element from Tabbar
 * @param {string} id - The id of the Tabbar
 */
function removeTabElement(id){
	let $activePage = $(id).parent().children('.page.active');
	let $activeTab = $(id).children($('li')).children('.active').parent();
	$activeTab.remove();
	$activePage.remove();
}


/**
 * Check if the string has a leading # as id identifier, if not it will be added
 * @param {string} id
 * @returns {string|*}
 */
function checkForId(id){
	const patt = new RegExp(/^\#/);
	let res = patt.test(id);
	if(!res){
		return '#' + id;
	}else{
		return id;
	}
}
