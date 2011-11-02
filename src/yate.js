require('./colors.js');

var parser = yate.parser;

var Fs = require('fs');

parser.init(yate.grammar);

parser.open({ filename: process.argv[2] });
var ast = parser.match('stylesheet');

if (process.argv[3] === '--print') { // FIXME: Заюзать commander.js или еще что.
    console.log( ast.yate() );
    process.exit(0);
}
if (process.argv[3] === '--ast') {
    console.log( ast.toString() );
    process.exit(0);
}

var data;
if (process.argv[3]) {
    data = JSON.parse( Fs.readFileSync( process.argv[3], 'utf-8' ) );
}

// Фазы-проходы по дереву:

// 0. Каждой ноде выставляется поле parent,
//    кроме того, создается (или наследуются от parent'а) scope.
ast.setParents();
ast.trigger('setScope');

// 1. Действие над каждой нодой в ast, не выходящее за рамки этой ноды и ее state/scope/context.
ast.trigger('action');

// 2. Оптимизация дерева. Группировка нод, перестановка, замена и т.д.
// ast.trigger('optimize');

// 3. Валидация. Проверяем типы, определенность переменных/функций и т.д.
ast.trigger('validate');

// Важно! Только после этого момента разрешается вызывать метод type() у нод.
// В фазах 0-3 он никогда не должен вызываться.

// 4. Подготовка к кодогенерации.
ast.trigger('prepare');

var runtime = Fs.readFileSync(__dirname + '/src/runtime.js', 'utf-8');

var js = yate.codetemplates.fill('js', 'main', '', {
    Runtime: runtime,
    Stylesheet: ast
});

if (data) {
    var stylesheet = eval( '(' + js + ')' );
    var result = require('vm').runInNewContext('(stylesheet(data))', {
        data: data,
        stylesheet: stylesheet
    });
    console.log(result);
} else {
    console.log(js);
}

