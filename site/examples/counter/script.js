let count = 0;
function update(delta) {
	count += delta;
	document.getElementById('count').textContent = count;
}
