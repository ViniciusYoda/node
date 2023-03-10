/*

Portando para a API Buffer.from()/Buffer.alloc()
Visão geral
Este guia explica como migrar para Buffermétodos construtores seguros. A migração corrige o seguinte aviso de descontinuação:

Os construtores Buffer() e new Buffer() não são recomendados para uso devido a questões de segurança e usabilidade. Em vez disso, use os novos métodos de construção Buffer.alloc(), Buffer.allocUnsafe() ou Buffer.from().

Variante 1: descartar o suporte para Node.js ≤ 4.4.xe 5.0.0 — 5.9.x ( recomendado )
Variante 2: Use um polyfill
Variante 3: Detecção manual, com salvaguardas
Encontrar trechos de código problemáticos usandogrep
Apenas corra grep -nrE '[^a-zA-Z](Slow)?Buffer\s*\(' --exclude-dir node_modules.

Ele encontrará todos os locais potencialmente inseguros em seu próprio código (com algumas exceções consideravelmente improváveis).

Encontrando trechos de código problemáticos usando Node.js 8
Se você estiver usando Node.js ≥ 8.0.0 (o que é recomendado), Node.js expõe várias opções que ajudam a encontrar as partes relevantes do código:

--trace-warningsfará com que o Node.js mostre um rastreamento de pilha para este aviso e outros avisos que são impressos pelo Node.js.
--trace-deprecationfaz a mesma coisa, mas apenas para avisos de descontinuação.
--pending-deprecationmostrará mais tipos de avisos de descontinuação. Em particular, ele mostrará o Buffer()aviso de descontinuação, mesmo no Node.js 8.
Você pode definir esses sinalizadores usando variáveis ​​de ambiente:

$ export NODE_OPTIONS='--trace-warnings --pending-deprecation'
$ cat example.js
'use strict';
const foo = new Buffer('foo');
$ node example.js
(node:7147) [DEP0005] DeprecationWarning: The Buffer() and new Buffer() constructors are not recommended for use due to security and usability concerns. Please use the new Buffer.alloc(), Buffer.allocUnsafe(), or Buffer.from() construction methods instead.
    at showFlaggedDeprecation (buffer.js:127:13)
    at new Buffer (buffer.js:148:3)
    at Object.<anonymous> (/path/to/example.js:2:13)
    [... more stack trace lines ...]
Encontrando pedaços de código problemáticos usando linters
As regras ESLint no-buffer-constructor ou node/no-deprecated-api também encontram chamadas para Buffer()a API obsoleta. Essas regras estão incluídas em algumas predefinições.

Há uma desvantagem, porém, que nem sempre funciona corretamente quando Bufferé substituído, por exemplo, com um polyfill, portanto, recomenda-se uma combinação deste e algum outro método descrito acima.

Variante 1: descartar o suporte para Node.js ≤ 4.4.xe 5.0.0 — 5.9.x
Esta é a solução recomendada hoje em dia que implicaria apenas uma sobrecarga mínima.

A linha de lançamento do Node.js 5.x não tem suporte desde julho de 2016, e a linha de lançamento do Node.js 4.x atinge seu fim de vida em abril de 2018 (→ Cronograma ). Isso significa que essas versões do Node.js não receberão nenhuma atualização, mesmo em caso de problemas de segurança, portanto, o uso dessas linhas de lançamento deve ser evitado, se possível.

O que você faria neste caso é converter todas as chamadas new Buffer()or Buffer()para use Buffer.alloc()or Buffer.from(), da seguinte forma:

Para new Buffer(number), substitua-o por Buffer.alloc(number).
Para new Buffer(string)(ou new Buffer(string, encoding)), substitua-o por Buffer.from(string)(ou Buffer.from(string, encoding)).
Para todas as outras combinações de argumentos (estes são muito mais raros), substitua também new Buffer(...arguments)por Buffer.from(...arguments).
Observe que Buffer.alloc()também é mais rápido nas versões atuais do Node.js do que new Buffer(size).fill(0), que é o que você precisaria para garantir o preenchimento zero.

A ativação da regra ESLint no-buffer-constructor ou node/no-deprecated-api é recomendada para evitar Buffero uso acidental e inseguro da API.

Há também um codemod JSCodeshift para migrar automaticamente Bufferconstrutores para Buffer.alloc()ou Buffer.from(). Observe que atualmente funciona apenas com casos em que os argumentos são literais ou em que o construtor é invocado com dois argumentos.

Se você atualmente oferece suporte a essas versões mais antigas do Node.js e não é possível descartar o suporte para elas, ou se você oferece suporte a ramificações mais antigas de seus pacotes, considere o uso da Variante 2 ou Variante 3 em ramificações mais antigas, para que as pessoas que usam essas ramificações mais antigas também recebam o consertar. Dessa forma, você eliminará possíveis problemas causados ​​pelo Bufferuso desprotegido da API e seus usuários não observarão um aviso de descontinuação do tempo de execução ao executar seu código no Node.js 10.

Variante 2: Use um polyfill
Existem três polyfills diferentes disponíveis:

safer-buffer é um substituto para toda aBufferAPI, que será lançado ao usarnew Buffer().

Você seguiria exatamente as mesmas etapas da Variant 1 , mas com um polyfill const Buffer = require('safer-buffer').Bufferem todos os arquivos em que usa a nova BufferAPI.

Não use a new Buffer()API antiga. Em todos os arquivos em que a linha acima é adicionada, o uso da new Buffer()API antiga lançará .

buffer-from e/ou buffer-alloc são ponyfills para suas respectivas partes daBufferAPI. Você só precisa adicionar o(s) pacote(s) correspondente(s) à API que está usando.

Você importaria o módulo necessário com um nome apropriado, por exemplo, const bufferFrom = require('buffer-from')e depois o usaria em vez da chamada para new Buffer(), por exemplo, new Buffer('test')torna-se bufferFrom('test').

Uma desvantagem dessa abordagem é um pouco mais de alterações de código para migrá-las (como você usaria, por exemplo, Buffer.from()com um nome diferente).

safe-buffer também é um substituto para toda aBufferAPI, mas o usonew Buffer()ainda funcionará como antes.

Uma desvantagem dessa abordagem é que ela permitirá que você também use a new Buffer()API mais antiga em seu código, o que é problemático, pois pode causar problemas em seu código e começará a emitir avisos de descontinuação do tempo de execução a partir do Node.js 10 ( leia mais aqui ).

Observe que, em ambos os casos, é importante que você também remova todas as chamadas para a Buffer API antiga manualmente — apenas inserir safe-buffernão resolve o problema por si só, apenas fornece um polyfill para a nova API. Já vi pessoas cometendo esse erro.

A ativação da regra ESLint no-buffer-constructor ou node/no-deprecated-api é recomendada.

Não se esqueça de descartar o uso de polyfill depois de descartar o suporte para Node.js < 4.5.0.

Variante 3 — Detecção manual, com salvaguardas
Isso é útil se você criar Bufferinstâncias em apenas alguns lugares (por exemplo, um), ou se tiver seu próprio wrapper em torno delas.

Buffer(0)
Este caso especial para criar buffers vazios pode ser substituído com segurança por Buffer.concat([]), que retorna o mesmo resultado até o Node.js 0.8.x.

Buffer(notNumber)
Antes:

const buf = new Buffer(notNumber, encoding);
Depois:

let buf;
if (Buffer.from && Buffer.from !== Uint8Array.from) {
  buf = Buffer.from(notNumber, encoding);
} else {
  if (typeof notNumber === 'number') {
    throw new Error('The "size" argument must be not of type number.');
  }
  buf = new Buffer(notNumber, encoding);
}
encodingé opcional.

Observe que o typeof notNumberantes new Buffer()é necessário (para casos em que notNumbero argumento não é codificado) e não é causado pela descontinuação do Bufferconstrutor — é exatamente por isso que o Bufferconstrutor foi descontinuado. Os pacotes do ecossistema sem essa verificação de tipo causaram vários problemas de segurança - situações em que a entrada não sanitizada do usuário poderia resultar na Buffer(arg)criação de problemas que variam de DoS a vazamento de informações confidenciais para o invasor a partir da memória do processo.

Quando notNumbero argumento é codificado (por exemplo, literal "abc"ou [0,1,2]), a typeofverificação pode ser omitida.

Além disso, observe que o uso do TypeScript não corrige esse problema para você - quando as bibliotecas escritas TypeScriptsão usadas a partir do JS ou quando a entrada do usuário termina lá - ele se comporta exatamente como o JS puro, pois todas as verificações de tipo são apenas em tempo de tradução e não são presente no código JS real para o qual o TS compila.

Buffer(number)
Para suporte Node.js 0.10.x (e abaixo):

let buf;
if (Buffer.alloc) {
  buf = Buffer.alloc(number);
} else {
  buf = new Buffer(number);
  buf.fill(0);
}
Caso contrário (Node.js ≥ 0.12.x):

const buf = Buffer.alloc ? Buffer.alloc(number) : new Buffer(number).fill(0);
A respeito deBuffer.allocUnsafe()
Seja extremamente cauteloso ao usar Buffer.allocUnsafe():

Não use se você não tiver um bom motivo para
por exemplo, você provavelmente nunca verá uma diferença de desempenho para buffers pequenos; na verdade, eles podem ser ainda mais rápidos com Buffer.alloc(),
se o seu código não estiver no hot code path - você provavelmente também não notará a diferença,
tenha em mente que o preenchimento zero minimiza os riscos potenciais.
Se você usá-lo, certifique-se de nunca retornar o buffer em um estado parcialmente preenchido,
se você estiver escrevendo sequencialmente - sempre trunque-o para o comprimento real escrito
Erros no manuseio de buffers alocados Buffer.allocUnsafe()podem resultar em vários problemas, variando de comportamento indefinido de seu código a dados confidenciais (entrada do usuário, senhas, certificados) vazando para o invasor remoto.

Observe que o mesmo se aplica ao new Buffer()uso sem preenchimento de zero, dependendo da versão do Node.js (e a falta de verificações de tipo também adiciona DoS à lista de possíveis problemas).

Perguntas frequentes
O que há de errado com o Bufferconstrutor?
O Bufferconstrutor pode ser usado para criar um buffer de várias maneiras diferentes:

new Buffer(42)cria um arquivo Bufferde 42 bytes. Antes do Node.js 8, esse buffer continha memória arbitrária por motivos de desempenho, que podia incluir qualquer coisa, desde o código-fonte do programa até senhas e chaves de criptografia.
new Buffer('abc')cria um Bufferque contém a versão codificada em UTF-8 da string 'abc'. Um segundo argumento pode especificar outra codificação: por exemplo, new Buffer(string, 'base64')pode ser usado para converter uma string Base64 na sequência original de bytes que ela representa.
Existem várias outras combinações de argumentos.
Isso significava que em códigos como var buffer = new Buffer(foo);, não é possível dizer qual é exatamente o conteúdo do buffer gerado sem saber o tipo de foo.

Às vezes, o valor de foovem de uma fonte externa. Por exemplo, esta função pode ser exposta como um serviço em um servidor web, convertendo uma string UTF-8 em seu formato Base64:

function stringToBase64(req, res) {
  // The request body should have the format of `{ string: 'foobar' }`.
  const rawBytes = new Buffer(req.body.string);
  const encoded = rawBytes.toString('base64');
  res.end({ encoded });
}
Observe que este código não valida o tipo de req.body.string:

req.body.stringespera-se que seja uma string. Se for este o caso, tudo correrá bem.
req.body.stringé controlado pelo cliente que envia a requisição.
Se req.body.stringfor o número 50 , o rawBytesseria 50bytes:
Antes do Node.js 8, o conteúdo seria não inicializado
Depois do Node.js 8, o conteúdo seria 50bytes com o valor0
Devido à verificação de tipo ausente, um invasor pode enviar intencionalmente um número como parte da solicitação. Usando isso, eles podem:

Leia a memória não inicializada. Isso vazará senhas, chaves de criptografia e outros tipos de informações confidenciais. (vazamento de informações)
Força o programa a alocar uma grande quantidade de memória. Por exemplo, ao especificar 500000000como valor de entrada, cada solicitação alocará 500 MB de memória. Isso pode ser usado para esgotar completamente a memória disponível de um programa e fazê-lo travar ou reduzi-lo significativamente. (Negação de serviço)
Ambos os cenários são considerados sérios problemas de segurança em um contexto de servidor da web do mundo real.

Ao usar Buffer.from(req.body.string)em vez disso, passar um número sempre lançará uma exceção, dando um comportamento controlado que sempre pode ser tratado pelo programa.

O Buffer()construtor foi obsoleto por um tempo. Isso é realmente um problema?
Pesquisas de código no npmecossistema mostraram que o Buffer()construtor ainda é amplamente utilizado. Isso inclui o novo código, e o uso geral desse código tem aumentado .

*/

