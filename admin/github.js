const url = 'https://io.all-smart.net/webhook/issues';

const optionalParam = {
	mode: 'no-cors',
	method: 'POST',
	headers: {
		'Content-Type':'application/json'
	},
	body: ''
};

async function deviceRequest(manufacturer, model, prodDate, link, text) {
	optionalParam.body = JSON.stringify({user: 'Jey-Cee', adapter: 'enocean',data: {
		'title': `${manufacturer} ${model}`,
		'body': `**Manufacturer:** ${manufacturer} \n **Model:** ${model} \n **Production date/period:** ${prodDate} \n **Link to product:** ${link} \n ${text}`,
		'labels': ['Device request'],
		'assignees': ['Jey-Cee']
	}});

	await fetch(url, optionalParam)
		.then(data => { console.log(data) })
		.then(res => { console.log(res) })
		.catch(error => { console.log(error)})
}
