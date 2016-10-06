/*global $, io*/
$(()=>{
	var socket = io();
	var list = $('#messages');
	socket.on('result', res=>{
		var answer = (res.correct) ? res.req+'='+res.msg : 'In expression "'+res.req+'" '+res.msg;
		list.append('<li>'+answer+'</li>');
	});

	var sendExpression=()=>{
		socket.emit('expression', $('#expr').val());
		$('#expr').val('');
		return false;
	};
	$('form button').click(sendExpression);
	$('form').submit(sendExpression);
});