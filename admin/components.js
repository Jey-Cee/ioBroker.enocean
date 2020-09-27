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
 * Add Datafield card to active tab
 * @param {string} id - The id of the Tabbar
 */
function addDatafield(id){
	$('.add-item').unbind('click');
	$('.add-range-scale').unbind('click');
	$('.remove-range-scale').unbind('click');
	$('.add-condition').unbind('click');

	let activeTab = $(id).children($('li')).children('.active').attr('href');
	let index = $(activeTab).children().length + 1;

	let card = '<div id="datafield-' + index + '" class="col s4">\n' +
		'      <div class="card grey lighten-4">\n' +
		'        <div class="card-content black-text">\n' +
		'                <input type="text" class="black-text datafield-name" placeholder="Datafield name" data-card="datafield-' + index + '">\n' +
		'                <div class="row">\n' +
		'                   <div class="col s6"><input type="text" class=" black-text shortcut" placeholder="Shortcut" data-card="datafield-' + index + '"></div>\n' +
		'                   <div class="col s3"><input type="number" class="black-text bitoffset" placeholder="Bit offset" data-card="datafield-' + index + '"></div>\n' +
		'                   <div class="col s3"><input type="number" class="black-text bitsize" placeholder="Bit size" data-card="datafield-' + index + '"></div>\n' +
		'                </div>\n' +
		'                   <div class="row iobroker-object">ioBroker object:\n' +
		'                       <div class="row">\n' +
		'                       <div class="input-field col s6">\n' +
		'                           <select class="select-object-role" data-card="datafield-' + index + '">\n' +
		'                               <option vlaue="0" selected>Choose role</option>\n' +
		'                           </select>\n' +
		'                       </div>\n' +
		'                       <div class="input-field col s6">\n' +
		'                           <select class="select-object-type" data-card="datafield-' + index + '">\n' +
		'                               <option vlaue="0" selected>Choose object type</option>\n' +
		'                           </select>\n' +
		'                       </div>\n' +
		'                       <div class="col s2 hide">\n' +
		'                           <input type="number" class=" black-text min" placeholder="Min" data-card="datafield-' + index + '">\n' +
		'                       </div>\n' +
		'                       <div class="col s2 hide">\n' +
		'                           <input type="number" class=" black-text max" placeholder="Max" data-card="datafield-' + index + '">\n' +
		'                       </div>\n' +
		'                       <div class="col s2 hide">\n' +
		'                           <input type="text" class=" black-text unit" placeholder="Unit" data-card="datafield-' + index + '">\n' +
		'                       </div>\n' +
		'                       <div class="col s2 hide">\n' +
		'                           <input type="number" class=" black-text step" placeholder="Step" data-card="datafield-' + index + '">\n' +
		'                       </div>\n' +
		'                       <div class="col s6">\n' +
		'                           <input type="text" class=" black-text states" placeholder="States" data-card="datafield-' + index + '">\n' +
		'                       </div>\n' +
		'                       <div class="col s4">\n' +
		'                           <input type="text" class=" black-text def" placeholder="Default" data-card="datafield-' + index + '">\n' +
		'                       </div>\n' +
		'                       <div class="col s3 input-checkbox">\n' +
		'                           <label>\n' +
		'                               <input type="checkbox" class="def-ack" data-card="datafield-' + index + '"/>\n' +
		'                               <span>Def ACK</span>\n' +
		'                           </label>\n' +
		'                       </div>\n' +
		'                       <div class="col s2 input-checkbox">\n' +
		'                           <label>\n' +
		'                               <input type="checkbox" class="object-read" data-card="datafield-' + index + '"/>\n' +
		'                               <span>Read</span>\n' +
		'                           </label>\n' +
		'                       </div>\n' +
		'                       <div class="col s2 input-checkbox">\n' +
		'                           <label>\n' +
		'                               <input type="checkbox" class="object-write" data-card="datafield-' + index + '"/>\n' +
		'                               <span>Write</span>\n' +
		'                           </label>\n' +
		'                       </div>\n' +
		'                           </div>\n' +
		'                   </div>\n' +
		'                   <div class="items hide">Items:</div>\n' +
		'                   <div class="range-scale hide">Range & Scale:</div>\n' +
		'                   <div class="conditions hide">Conditions:</div>\n' +
		'        </div>\n' +
		'           <div class="card-action center">\n' +
		'          <a class="waves-effect waves-light btn add-item" data-card="datafield-' + index + '">Add item</a>\n' +
		'          <a class="waves-effect waves-light btn add-range-scale" data-card="datafield-' + index + '">Add range/scale</a>\n' +
		'          <a class="waves-effect waves-light btn remove-range-scale hide" data-card="datafield-' + index + '">Remove range/scale</a>\n' +
		'          <a class="waves-effect waves-light btn add-condition" data-card="datafield-' + index + '">Add condition</a>\n' +
		'          <a class="waves-effect waves-light btn remove-datafield" data-card="datafield-' + index + ' ">Remove</a>\n' +
		'        </div>\n' +
		'      </div>\n' +
		'    </div>';

	$(activeTab).append(card);

	let roles = [];
	for(let i in roles_definition){
		roles.push(i);
	}

	fillSelect('#datafield-' + index + ' > .card > .card-content > .iobroker-object > div > div:nth-child(1) > .select-object-role', roles);

	let oType = [];
	for(let x in commonAttributes.type.type){
		oType.push(commonAttributes.type.type[x]);
	}
	fillSelect('#datafield-' + index + ' > .card > .card-content > .iobroker-object > div > div:nth-child(2) > .select-object-type', oType);

	$('.remove-datafield').on('click', (e) => {
		let card = $(e.currentTarget).attr('data-card');
		$('#' + card).remove();
	});

	$('.add-item').on('click', (e) => {
		let card = '#' + $(e.currentTarget).attr('data-card');

		addItemToCard(card);
	});

	$('.add-range-scale').on('click', (e) => {
		$('.remove-range-scale').unbind('click');

		let card = $(e.currentTarget).attr('data-card');
		$('#' + card).find('.range-scale').removeClass('hide');

		let item =  '<div class="row">\n' +
			'<div class="col s3"><input type="number" class="black-text range-min" placeholder="Range min"></div>\n' +
			'<div class="col s3"><input type="number" class="black-text range-max" placeholder="Range max"></div>\n' +
			'<div class="col s3"><input type="number" class="black-text scale-min" placeholder="Scale min"></div>\n' +
			'<div class="col s3"><input type="number" class="black-text scale-max" placeholder="Scale max"></div>\n' +
			'</div>';

		$('#' + card).children().children('.card-content.black-text').children('.range-scale').append(item);

		$(e.currentTarget).parent().children('.add-item').addClass('disabled');
		$(e.currentTarget).parent().children('.remove-range-scale').removeClass('hide');
		$(e.currentTarget).parent().children('.add-range-scale').addClass('hide');

		$('.remove-range-scale').on('click', (e) => {
			let card = $(e.currentTarget).attr('data-card');
			$('#' + card).children().children('.card-content.black-text').children('.range-scale').empty();

			$('#' + card).children().children('.card-action.center').children('.remove-range-scale').addClass('hide');
			$('#' + card).children().children('.card-action.center').children('.add-range-scale').removeClass('hide');
			$('#' + card).children().children('.card-action.center').children('.add-item').removeClass('disabled');

			$('#' + card).children().children('.card-content.black-text').children('.range-scale').addClass('hide');
		});
	});


	$('.add-condition').on('click', (e) => {
		$('.remove-condition').unbind('click');
		let card = $(e.currentTarget).attr('data-card');
		$(e.currentTarget).parent().parent().children('.card-content.black-text').children('.conditions').removeClass('hide');

		let item =  '<div class="row valign-wrapper">\n' +
			'<div class="col s2"><input type="number" class="black-text condition-bitoffset" placeholder="Bitoffset"></div>\n' +
			'<div class="col s2"><input type="number" class="black-text condition-bitsize" placeholder="Bitsize"></div>\n' +
			'<div class="col s7"><input type="text" class=" black-text value" placeholder="Value(s) use | as divider"></div>\n' +
			'<a class="btn-flat remove-condition"><i class="material-icons">delete</i></a>\n' +
			'</div>';

		$(e.currentTarget).parent().parent().children('.card-content.black-text').children('.conditions').append(item);

		$('.remove-condition').on('click', (e) => {
			let no_items = $(e.currentTarget).parent().parent().children().length;
			console.log(no_items);

			if(no_items === 1){
				$(e.currentTarget).parent().parent().addClass('hide');
			}

			$(e.currentTarget).parent().remove();
		});
	});
}

/**
 * Add item input fields to a specified datafield card
 * @param {string} card - id of the datafield, e.g. #datafield-1
 */
function addItemToCard(card){
	card =  checkForId(card);
	$('.remove-item').unbind('click');
	$('.switch-item-type').unbind('click');

	$(card).children().children('.card-content.black-text').children('.items').removeClass('hide');

	let item = '<div class="row valign-wrapper">\n' +
		'<div class="col s2"><input type="number" class="black-text item-value" placeholder="Value"></div>\n' +
		'<div class="col s2 hide"><input type="number" class="black-text item-min" placeholder="Min"></div>\n' +
		'<div class="col s2 hide"><input type="number" class="black-text item-max" placeholder="Max"></div>\n' +
		'<div class="col s5"><input type="text" class=" black-text item-description" placeholder="Description"></div>\n' +
		'<div class="col s4"><input type="text" class=" black-text item-iobroker-value" placeholder="ioBroker Value"></div>\n' +
		'<a class="btn-flat switch-item-type"><i class="material-icons">autorenew</i></a>\n' +
		'<a class="btn-flat remove-item"><i class="material-icons">delete</i></a>\n' +
		'</div>';

	$(card).children().children('.card-content.black-text').children('.items').append(item);

	$(card + '> .card > .card-action > .add-range-scale').addClass('disabled');

	$('.remove-item').on('click', (e) => {

		let no_items = $(e.currentTarget).parent().parent().children().length;

		if (no_items === 1) {
			let test = $(e.target).parent().parent().parent().parent().parent().children('.card-action').children('.add-range-scale').removeClass('disabled');
			$('.items').addClass('hide');
		}

		$(e.currentTarget).parent().remove();

	});

	$('.switch-item-type').on('click', (e) => {
		if ($(e.target).parent().parent().find('.item-value').parent().attr('class') === 'col s2 hide') {
			$(e.target).parent().parent().find('.item-value').parent().removeClass('hide');
			$(e.target).parent().parent().find('.item-min').parent().addClass('hide');
			$(e.target).parent().parent().find('.item-max').parent().addClass('hide');
		} else {
			$(e.target).parent().parent().find('.item-value').parent().addClass('hide');
			$(e.target).parent().parent().find('.item-min').parent().removeClass('hide');
			$(e.target).parent().parent().find('.item-max').parent().removeClass('hide');
		}

	});
}

/**
 * Load eep Profile from JSON object, which will be loaded on entering config.
 * @param {object} e - event from select
 */
function loadEEP(e){
	let eep = e.currentTarget.value;
	let eepObject = eepList[eep.replace(/-/g, '')];

	$('#editor-eep-name').val(eepObject.eep);
	$('#editor-eep-title').val(eepObject.type_title);

	if(eepObject.case){
		let cases = eepObject.case.length;

		if(cases !== undefined){
			for(let i = 0; i < cases; i++){
				let x = i + 1;
				if(i > 0){
					addTabElement('#editor-case-selection', 'Case', 'editor-navbar', true);
					$('#editor-case-selection > li').each( (i, e) => {
						$(e).children('a').removeClass('active');
					});
					$('#editor-navbar-case-' + x + ' > a').addClass('active');
					$('#editing-main > .section > .page').each( (i, e) => {
						$(e).removeClass('active');
						$(e).attr('style', 'display: none;');
					});
					$('#tab-case-' + x).addClass('active');
					$('#tab-case-' + x).attr('style', 'display: block;');
				}
				addDatafield('#editor-case-selection');
				fillDatafield(x, eepObject.case[i]);
			}
		}else{
			fillDatafield(1, eepObject.case);
		}
	}

	M.updateTextFields();
}

/**
 * Fill a single datafield with data from JSON
 * @param {number} case_no - index of the case tab
 * @param {object} data - eep definition for case as json
 */
function fillDatafield(case_no, data){
	let tabId = $('#editor-case-selection').children('ul li:nth-child(' + case_no + ')').children('a').attr('href');
	$(tabId).empty();

	let cases = $('#editor-case-selection').children().length;

	let navId = $('#editor-case-selection').children('ul li:nth-child(' + case_no + ')').attr('id');

	let nos = $(tabId).children().length;

	for(let d in data.datafield){
		const index = parseInt(d) + 1;
		if(index > nos){
			addDatafield('#editor-case-selection');
		}

		$(tabId + '> #datafield-' + index).find('.datafield-name').val(data.datafield[d].data);
		$(tabId + '> #datafield-' + index).find('.shortcut').val(data.datafield[d].shortcut);
		$(tabId + '> #datafield-' + index).find('.bitoffset').val(data.datafield[d].bitoffs);
		$(tabId + '> #datafield-' + index).find('.bitsize').val(data.datafield[d].bitsize);

		if(data.datafield[d].iobroker){
			console.log(data.datafield[d].iobroker.role);
			let sObjRole = $(tabId + '> #datafield-' + index + '> .card > .card-content > .iobroker-object > div > div > div').children('.select-object-role');
			sObjRole.val(data.datafield[d].iobroker.role);
			sObjRole.change();
			instances = M.FormSelect.init($(sObjRole));
			let sObjType = $(tabId + '> #datafield-' + index + '> .card > .card-content > .iobroker-object > div > div > div').children('.select-object-type');
			sObjType.val(data.datafield[d].iobroker.type).change();
			instances = M.FormSelect.init($(sObjType));
			$(tabId + '> #datafield-' + index).find('.def').val(data.datafield[d].iobroker.default);
			$(tabId + '> #datafield-' + index).find('.def-ack').prop('checked', data.datafield[d].iobroker.defAck);
			$(tabId + '> #datafield-' + index).find('.object-read').prop('checked', data.datafield[d].iobroker.read);
			$(tabId + '> #datafield-' + index).find('.object-write').prop('checked', data.datafield[d].iobroker.write);
		}

		if(data.datafield[d].enum !== undefined){
			for(let i in data.datafield[d].enum.item){
				const item = data.datafield[d].enum.item[i];
				addItemToDatafield(tabId + '> #datafield-' + index, item.value, null , null, item.description, item.iobroker_value);
			}
		}

		if(data.datafield[d].range!== undefined){
			let range = data.datafield[d].range;
			let scale = data.datafield[d].scale;
			addRangeToDatafield(tabId + '> #datafield-' + index, range.min, range.max, scale.min, scale.max);
		}


		/*let elems =  document.querySelectorAll('.select-object-role');
		instances = M.FormSelect.init($(elems));*/
	}

	
}

/**
 *
 * @param {string} cardId - ID of the datafield card, e.g. datafield-1
 * @param {number} value - Value is always a number, if it is null min/max is used
 * @param {number} min - Alternative to single value, max must be set also
 * @param {number} max - see min
 * @param {string} description
 * @param {string} ioValue - Value which will set in ioBroker
 */
function addItemToDatafield(cardId, value, min, max,description, ioValue){
	const id =  checkForId(cardId);
	const itemCount = $(id + '> .card > .card-content > .items').children().length + 1;

	if($(id + '> .card > .card-content > .items').attr('class') === 'items hide'){
		$(id + '> .card > .card-content > .items').removeClass('hide');
	}

	addItemToCard(id);

	if(value === null || value === undefined){

	}else{
		const child = $(id + '> .card > .card-content > .items div:nth-child(' + itemCount + ')');
		$(child).children().children('.item-value').val(value);
		$(child).children().children('.item-description').val(description);
		$(child).children().children('.item-iobroker-value').val(ioValue);
	}
}

/**
 *
 * @param {string} cardId - ID of the datafield card, e.g. datafield-1
 * @param {number} rangeMin
 * @param {number} rangeMax
 * @param {number} scaleMin
 * @param {number} scaleMax
 */
function addRangeToDatafield(cardId, rangeMin, rangeMax, scaleMin, scaleMax){
	const id =  checkForId(cardId);
	const rng = $(id + '> .card > .card-content > .range-scale');

	if(rng.attr('class') === 'range-scale hide'){
		rng.removeClass('hide');
	}

	$(`${id} > .card > .card-action > .add-range-scale`).trigger('click');

	rng.children('div').children('div:nth-child(1)').children('.range-min').val(rangeMin);
	rng.children('div').children('div:nth-child(2)').children('.range-max').val(rangeMax);
	rng.children('div').children('div:nth-child(3)').children('.scale-min').val(scaleMin);
	rng.children('div').children('div:nth-child(4)').children('.scale-max').val(scaleMax);

	M.updateTextFields();
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