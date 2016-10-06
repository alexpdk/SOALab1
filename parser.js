var _ = require('underscore');
var Lexer = require('lex');

"use strict";

var parse = function(str, output){

	var shuntingAlg = function(){
		var operatorAllowed = false;
		var prec; //tmp precedence storage
		var res = {correct: true};
		var token;
		var unaryAllowed = true;

		if(!tokens.length){
			res = {correct: false, msg: "Empty expression received"};
		}
		while((token = tokens[++index]) !== undefined && res.correct){
			if(!token.length){ // fast number check
				if(!operatorAllowed){
					output.push(token);
					operatorAllowed = true;
				}
				else res = {correct: false, msg: "Unexpected number: "+token};
			}
			else if((prec = Precedence[token]) > 0){
				if(operatorAllowed){
					while(Precedence[_.last(stack)] >= prec) output.push(stack.pop());
					stack.push(token);
				}
				else if(token=='-' && unaryAllowed){
					stack.push("Neg");
				}
				else if(token=='+' && unaryAllowed){
					/*just ignore*/
				}
				else res = {correct: false, msg: "Unexpected operator: "+token};
				unaryAllowed = false;
				operatorAllowed = false;
			}
			else if(token == '('){
				if(!operatorAllowed){
					stack.push('(');
					unaryAllowed = true;
				}
				else res = {correct: false, msg: "Unexpected bracket: "+token};
			}
			else if(token == ')'){
				if(operatorAllowed){
					while(stack.length && _.last(stack) != '('){
						output.push(stack.pop());
					}
					if(stack.length){
						stack.pop();
						// if function call is at stack top: -()
						if( stack.length && !Precedence[_.last(stack)]){
							output.push(stack.pop());
						}
						continue;
					}
				}
				//check shorhand expression X+()
				else if(tokens[index-1] == '('){

					output.push(0);
					stack.pop();
					// if function call is at stack top
					if( stack.length && !Precedence[_.last(stack)]){
						output.push(stack.pop());
					}
					operatorAllowed = true;
					continue;
				}
				res = {correct: false, msg: "Unexpected bracket: "+token};
			}
			else if(token.startsWith("Unexpected")){
				res = {correct: false, msg: token};
			}
		}
		if( res.correct && !operatorAllowed){
			res = {correct: false, msg: "Unexpected line end: "+tokens[index-1]};
		}
		while(stack.length && res.correct){
			token = stack.pop();
			if(Precedence[token] > 0){
				output.push(token);
			}
			else res = {correct: false, msg: "Bracket error"};
		}
		return res;
	};

	// split string to tokens
	var tokenizer = new Lexer(char=>"Unexpected char: "+char);
	tokenizer.addRule(/[0-9]+(\.[0-9]+)?/, token=>parseFloat(token));
	tokenizer.addRule(/[\(\+\-\*\/\)\^]/, token=>token);

	str = str.replace(/\s/g,'');
	tokenizer.setInput(str);
	var tokens = [];
	while((token = tokenizer.lex()) !== undefined){
		tokens.push(token);
	}
	var stack = [];
	var token;
	var Precedence = {
		'(':-1, '+':1, '-':1, '*':2, '/':2, 'Neg':3, '^':4
	};
	// token index
	var index = -1;
	return shuntingAlg();
};

var tokens = [];
var res = parse("3 + 4 * 2 / (1 - 5)^2", tokens);
console.assert(res.correct);
console.assert(_.isEqual(tokens, [3, 4, 2, '*', 1, 5, '-', 2, '^', '/', '+']));

tokens = [];
res = parse("2*( -51 + 4.58/ 26)", tokens);
console.assert(res.correct);
console.assert(_.isEqual(tokens, [2, 51, 'Neg', 4.58, 26, '/', '+', '*']));

tokens = [];
res = parse("6.42*(15--9)", tokens);
console.assert(!res.correct);
console.assert(res.msg == "Unexpected operator: -");

tokens = [];
res = parse("((15", tokens);
console.assert(!res.correct);
console.assert(res.msg == "Bracket error");

tokens = [];
res = parse("7.92.93", tokens);
console.assert(!res.correct);
console.assert(res.msg == "Unexpected char: .");

tokens = [];
res = parse("(29-92*)+5", tokens);
console.assert(!res.correct);
console.assert(res.msg == "Unexpected bracket: )");

tokens = [];
res = parse("12-", tokens);
console.assert(!res.correct);
console.assert(res.msg == "Unexpected line end: -");

tokens = [];
res = parse("12-(", tokens);
console.assert(!res.correct);
console.assert(res.msg == "Unexpected line end: (");

tokens = [];
res = parse("(3))", tokens);
console.assert(!res.correct);
console.assert(res.msg == "Unexpected bracket: )");

tokens = [];
res = parse("2+()*6", tokens);
console.assert(res.correct);
console.assert(_.isEqual(tokens, [2, 0, 6,'*','+']));

tokens = [];
res = parse("2+()1", tokens);
console.assert(!res.correct);
console.assert(res.msg == "Unexpected number: 1");

var evaluate = function(str){
	var tokens = [];
	var res = parse(str, tokens);
	res.req = str;
	if(!res.correct) return res;

	var stack = [];
	var tmp;
	tokens.forEach(token=>{
		if(!token.length){
			stack.push(token);
		}else if(token == '+'){
			stack.push(stack.pop()+stack.pop());
		}else if(token == '-'){
			tmp = stack.pop();
			stack.push(stack.pop()-tmp);
		}else if(token == '*'){
			stack.push(stack.pop()*stack.pop());
		}else if(token == '/'){
			tmp = stack.pop();
			stack.push(stack.pop()/tmp);
		}else if(token == '^'){
			tmp = stack.pop();
			stack.push(Math.pow(stack.pop(), tmp));
		}else if(token == 'Neg'){
			stack.push(-stack.pop());
		}
	});
	res.msg = stack.pop();
	if(!_.isFinite(res.msg)) res = {correct: false, req: str, msg: "Zero division error"};
	return res;
};

var floatEq = (a, b)=>Math.abs(a-b)<0.001;

console.assert(floatEq(
	evaluate("3 + 4 * 2 / (1 - 5)^2").msg,
	3.5
));
// console.log(_.isFinite(evaluate("3 / (5 - 5)").msg));
console.assert(
	evaluate("3 / (5 - 5)").msg == "Zero division error"
);
console.assert(floatEq(
	evaluate("2*( -51 + 4 / 26)").msg, 
	-101.6923
));
console.assert(floatEq(
	evaluate("9.47/0.22+0.1").msg, 
	43.1454545
));
console.assert(floatEq(
	evaluate("3^0").msg, 
	1
));
//
// Unary operator tests
// 
console.assert(floatEq(
	evaluate("-2^2").msg, 
	-4
));
console.assert(floatEq(
	evaluate("(-2)^2").msg, 
	4
));
console.assert(floatEq(
	evaluate("-((-2)^(-2))").msg, 
	-0.25
));
console.assert(floatEq(
	evaluate("-2^2^3").msg, 
	-64
));
console.assert(floatEq(
	evaluate("-(2^2)+1").msg, 
	-3
));
console.assert(floatEq(
	evaluate("-(-2*3+1)").msg, 
	5
));
console.assert(floatEq(
	evaluate("+(-2*3+1)").msg, 
	-5
));
console.assert(
	evaluate("+-(-2*3+1)").msg == "Unexpected operator: -"
);
// Unary with brackets
console.assert(floatEq(
	evaluate("-()+2").msg, 
	2
));
console.assert(floatEq(
	evaluate("-(+())").msg, 
	0
));

module.exports = {evaluate};