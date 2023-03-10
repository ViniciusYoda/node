/*

Práticas recomendadas de segurança do Node.js
Intenção
Este documento pretende estender o modelo de ameaça atual e fornecer orientações abrangentes sobre como proteger um aplicativo Node.js.

Conteúdo do Documento
Melhores práticas: uma forma simplificada e condensada de ver as melhores práticas. Podemos usar esta questão ou esta diretriz como ponto de partida. É importante observar que este documento é específico para Node.js, se você procura algo amplo, considere OSSF Best Practices .
Ataques explicados: ilustre e documente em inglês simples com algum exemplo de código (se possível) os ataques que estamos mencionando no modelo de ameaça.
Bibliotecas de terceiros: definir ameaças (ataques de digitação, pacotes maliciosos...) e melhores práticas em relação a dependências de módulos de nós, etc...
Lista de Ameaças
Negação de serviço do servidor HTTP (CWE-400)
Este é um ataque em que o aplicativo fica indisponível para a finalidade para a qual foi projetado devido à maneira como processa as solicitações HTTP recebidas. Essas solicitações não precisam ser elaboradas deliberadamente por um ator mal-intencionado: um cliente mal configurado ou com erros também pode enviar um padrão de solicitações ao servidor que resulta em uma negação de serviço.

As solicitações HTTP são recebidas pelo servidor HTTP Node.js e entregues ao código do aplicativo por meio do manipulador de solicitações registrado. O servidor não analisa o conteúdo do corpo da solicitação. Portanto, qualquer DoS causado pelo conteúdo do corpo após ser entregue ao manipulador de solicitações não é uma vulnerabilidade no próprio Node.js, pois é responsabilidade do código do aplicativo tratá-lo corretamente.

Certifique-se de que o WebServer lide com erros de soquete corretamente, por exemplo, quando um servidor é criado sem tratamento de erro, ele ficará vulnerável a DoS

const net = require('net');

const server = net.createServer(function(socket) {
  // socket.on('error', console.error) // this prevents the server to crash
  socket.write('Echo server\r\n');
  socket.pipe(socket);
});

server.listen(5000, '0.0.0.0');
Se uma solicitação inválida for executada, o servidor poderá travar.

Um exemplo de ataque DoS que não é causado pelo conteúdo da solicitação é o Slowloris . Nesse ataque, as solicitações HTTP são enviadas de forma lenta e fragmentada, um fragmento por vez. Até que a solicitação completa seja entregue, o servidor manterá recursos dedicados à solicitação em andamento. Se um número suficiente dessas solicitações for enviado ao mesmo tempo, a quantidade de conexões simultâneas logo atingirá seu máximo, resultando em uma negação de serviço. É assim que o ataque não depende do conteúdo da solicitação, mas do tempo e do padrão das solicitações enviadas ao servidor.

Mitigações

Use um proxy reverso para receber e encaminhar solicitações para o aplicativo Node.js. Os proxies reversos podem fornecer cache, balanceamento de carga, lista negra de IP, etc., o que reduz a probabilidade de um ataque DoS ser eficaz.
Configure corretamente os tempos limite do servidor, para que as conexões que estão ociosas ou onde as solicitações estão chegando muito lentamente possam ser descartadas. Veja os diferentes tempos limite em http.Server, particularmente headersTimeout, requestTimeout, timeoute keepAliveTimeout.
Limite o número de soquetes abertos por host e no total. Consulte os documentos http , particularmente agent.maxSockets, agent.maxTotalSocketse agent.maxFreeSockets .server.maxRequestsPerSocket
Religação de DNS (CWE-346)
Este é um ataque que pode atingir aplicativos Node.js sendo executados com o inspetor de depuração ativado usando a opção --inspect .

Como os sites abertos em um navegador da Web podem fazer solicitações WebSocket e HTTP, eles podem direcionar o inspetor de depuração em execução localmente. Isso geralmente é evitado pela política de mesma origem implementada pelos navegadores modernos, que proíbe os scripts de acessar recursos de origens diferentes (o que significa que um site malicioso não pode ler os dados solicitados de um endereço IP local).

No entanto, por meio da religação de DNS, um invasor pode controlar temporariamente a origem de suas solicitações para que pareçam originar-se de um endereço IP local. Isso é feito controlando um site e o servidor DNS usado para resolver seu endereço IP. Consulte o wiki DNS Rebinding para obter mais detalhes.

Mitigações

Desative o inspetor no sinal SIGUSR1 anexando um process.on(‘SIGUSR1’, …) ouvinte a ele.
Não execute o protocolo do inspetor em produção.
Exposição de informações confidenciais a um ator não autorizado (CWE-552)
Todos os arquivos e pastas incluídos no diretório atual são enviados para o registro npm durante a publicação do pacote.

Existem alguns mecanismos para controlar esse comportamento definindo uma lista de bloqueio com .npmignoree .gitignoreou definindo uma lista de permissões nopackage.json

Mitigações

Usando npm publish --dry-runliste todos os arquivos para publicar. Certifique-se de revisar o conteúdo antes de publicar o pacote.
Também é importante criar e manter arquivos ignorados como .gitignoree .npmignore. Ao longo desses arquivos, você pode especificar quais arquivos/pastas não devem ser publicados. A propriedade files em package.jsonpermite a operação inversa -- lista permitida.
Em caso de exposição, certifique-se de cancelar a publicação do pacote .
Contrabando de solicitação HTTP (CWE-444)
Este é um ataque que envolve dois servidores HTTP (geralmente um proxy e um aplicativo Node.js). Um cliente envia uma solicitação HTTP que passa primeiro pelo servidor front-end (o proxy) e depois é redirecionada para o servidor back-end (o aplicativo). Quando o front-end e o back-end interpretam solicitações HTTP ambíguas de maneira diferente, existe a possibilidade de um invasor enviar uma mensagem maliciosa que não será vista pelo front-end, mas será vista pelo back-end, efetivamente "contrabandeando " passou pelo servidor proxy.

Consulte o CWE-444 para obter uma descrição mais detalhada e exemplos.

Devido ao fato de que esse ataque depende do Node.js interpretar as solicitações HTTP de maneira diferente de um servidor HTTP (arbitrário), um ataque bem-sucedido pode ser devido a uma vulnerabilidade no Node.js, no servidor front-end ou em ambos. Se a forma como a solicitação é interpretada pelo Node.js for consistente com a especificação HTTP (consulte RFC7230 ), ela não será considerada uma vulnerabilidade no Node.js.

Mitigações

Não use a insecureHTTPParseropção ao criar um servidor HTTP.
Configure o servidor front-end para normalizar solicitações ambíguas.
Monitore continuamente novas vulnerabilidades de contrabando de solicitação HTTP no Node.js e no servidor front-end de sua escolha.
Use HTTP/2 de ponta a ponta e desabilite o downgrade de HTTP, se possível.
Exposição de informações por meio de ataques de temporização (CWE-208)
Este é um ataque que permite ao invasor aprender informações potencialmente confidenciais, por exemplo, medindo quanto tempo leva para o aplicativo responder a uma solicitação. Este ataque não é específico para Node.js e pode atingir quase todos os tempos de execução.

O ataque é possível sempre que o aplicativo usa um segredo em uma operação sensível ao tempo (por exemplo, ramificação). Considere lidar com a autenticação em um aplicativo típico. Aqui, um método de autenticação básico inclui e-mail e senha como credenciais. As informações do usuário são recuperadas da entrada que o usuário forneceu, idealmente, de um DBMS. Ao recuperar as informações do usuário, a senha é comparada com as informações do usuário recuperadas do banco de dados. O uso da comparação de string integrada leva mais tempo para os mesmos valores de comprimento. Essa comparação, quando executada por um valor aceitável aumenta involuntariamente o tempo de resposta da solicitação. Ao comparar os tempos de resposta da solicitação, um invasor pode adivinhar o tamanho e o valor da senha em grande quantidade de solicitações.

Mitigações

A API de criptografia expõe uma função timingSafeEqualpara comparar valores sensíveis reais e esperados usando um algoritmo de tempo constante.

Para comparação de senha, você pode usar o scrypt disponível também no módulo de criptografia nativo.

De forma mais geral, evite usar segredos em operações de tempo variável. Isso inclui a ramificação de segredos e, quando o invasor pode estar localizado na mesma infraestrutura (por exemplo, a mesma máquina em nuvem), usar um segredo como um índice na memória. Escrever código de tempo constante em JavaScript é difícil (em parte por causa do JIT). Para aplicativos criptográficos, use as APIs criptográficas integradas ou WebAssembly (para algoritmos não implementados nativamente).

Módulos maliciosos de terceiros (CWE-1357)
Atualmente, no Node.js, qualquer pacote pode acessar recursos poderosos, como acesso à rede. Além disso, como eles também têm acesso ao sistema de arquivos, podem enviar qualquer dado para qualquer lugar.

Todo código executado em um processo de nó tem a capacidade de carregar e executar código arbitrário adicional usando eval()(ou seus equivalentes). Todo o código com acesso de gravação do sistema de arquivos pode obter a mesma coisa gravando em arquivos novos ou existentes que são carregados.

O Node.js tem um mecanismo de política experimental¹ para declarar o recurso carregado como não confiável ou confiável. No entanto, essa política não é habilitada por padrão. Certifique-se de fixar as versões de dependência e executar verificações automáticas de vulnerabilidades usando fluxos de trabalho comuns ou scripts npm. Antes de instalar um pacote, certifique-se de que este pacote seja mantido e inclua todo o conteúdo que você espera. Cuidado, o código-fonte do Github nem sempre é o mesmo que o publicado, valide-o no node_modules .

Ataques à cadeia de suprimentos
Um ataque à cadeia de suprimentos em um aplicativo Node.js ocorre quando uma de suas dependências (direta ou transitiva) é comprometida. Isso pode acontecer devido ao aplicativo ser muito negligente na especificação das dependências (permitindo atualizações indesejadas) e/ou erros de digitação comuns na especificação (vulnerável a typosquatting ) .

Um invasor que assume o controle de um pacote upstream pode publicar uma nova versão com código malicioso. Se um aplicativo Node.js depender desse pacote sem ser rigoroso sobre qual versão é segura para usar, o pacote pode ser atualizado automaticamente para a versão maliciosa mais recente, comprometendo o aplicativo.

As dependências especificadas no package.jsonarquivo podem ter um número de versão exato ou um intervalo. No entanto, ao fixar uma dependência em uma versão exata, suas dependências transitivas não são fixadas. Isso ainda deixa o aplicativo vulnerável a atualizações indesejadas/inesperadas.

Possíveis ataques vetoriais:

Ataques de Typosquatting
Envenenamento de arquivo de bloqueio
Mantenedores comprometidos
Pacotes maliciosos
Confusões de Dependência
Mitigações

Evite que o npm execute scripts arbitrários com--ignore-scripts
Além disso, você pode desativá-lo globalmente comnpm config set ignore-scripts true
Fixe as versões de dependência em uma versão imutável específica, não uma versão que seja um intervalo ou de uma fonte mutável.
Use arquivos de bloqueio, que fixam todas as dependências (diretas e transitivas).
Use atenuações para envenenamento de arquivo de bloqueio .
Automatize as verificações de novas vulnerabilidades usando CI, com ferramentas como [ npm-audit][].
Ferramentas como Socketpodem ser usadas para analisar pacotes com análise estática para encontrar comportamentos de risco, como acesso à rede ou ao sistema de arquivos.
Use npm ciem vez de npm install. Isso impõe o lockfile para que as inconsistências entre ele e o arquivo package.json causem um erro (em vez de ignorar silenciosamente o lockfile em favor do package.json ).
Verifique cuidadosamente se há erros/erros de digitação no arquivo package.json nos nomes das dependências.
Violação de acesso à memória (CWE-284)
Os ataques baseados em memória ou heap dependem de uma combinação de erros de gerenciamento de memória e um alocador de memória explorável. Como todos os tempos de execução, o Node.js é vulnerável a esses ataques se seus projetos forem executados em uma máquina compartilhada. O uso de um heap seguro é útil para evitar que informações confidenciais vazem devido a saturações e insuficiências do ponteiro.

Infelizmente, heap seguro não está disponível no Windows. Mais informações podem ser encontradas na documentação do heap seguro do Node.js .

Mitigações

Use --secure-heap=ndependendo do seu aplicativo onde n é o tamanho máximo de byte alocado.
Não execute seu aplicativo de produção em uma máquina compartilhada.
Patch de macaco (CWE-349)
Monkey patching refere-se à modificação de propriedades em tempo de execução com o objetivo de alterar o comportamento existente. Exemplo:

// eslint-disable-next-line no-extend-native
Array.prototype.push = function (item) {
  // overriding the global [].push
};
Mitigações

O --frozen-intrinsicssinalizador habilita intrínsecos experimentais ¹ congelados, o que significa que todos os objetos e funções JavaScript integrados são congelados recursivamente. Portanto, o snippet a seguir não substituirá o comportamento padrão de Array.prototype.push

// eslint-disable-next-line no-extend-native
Array.prototype.push = function (item) {
  // overriding the global [].push
};

// Uncaught:
// TypeError <Object <Object <[Object: null prototype] {}>>>:
// Cannot assign to read only property 'push' of object ''
No entanto, é importante mencionar que você ainda pode definir novos globais e substituir globais existentes usandoglobalThis

> globalThis.foo = 3; foo; // you can still define new globals
3
> globalThis.Array = 4; Array; // However, you can also replace existing globals
4
Portanto, Object.freeze(globalThis)pode ser usado para garantir que nenhum global seja substituído.

Protótipo de Ataques de Poluição (CWE-1321)
A poluição de protótipo refere-se à possibilidade de modificar ou injetar propriedades em itens de linguagem Javascript abusando do uso de _proto_ , constructor , protótipo e outras propriedades herdadas de protótipos integrados.

const a = {"a": 1, "b": 2};
const data = JSON.parse('{"__proto__": { "polluted": true}}');

const c = Object.assign({}, a, data);
console.log(c.polluted); // true

// Potential DoS
const data2 = JSON.parse('{"__proto__": null}');
const d = Object.assign(a, data2);
d.hasOwnProperty('b'); // Uncaught TypeError: d.hasOwnProperty is not a function
Esta é uma vulnerabilidade potencial herdada da linguagem JavaScript.

Exemplos :

CVE-2022-21824 (Node.js)
CVE-2018-3721 (biblioteca de terceiros: Lodash)
Mitigações

Evite fusões recursivas inseguras , consulte CVE-2018-16487 .
Implemente validações de esquema JSON para solicitações externas/não confiáveis.
Crie objetos sem protótipo usando Object.create(null).
Congelando o protótipo: Object.freeze(MyObject.prototype).
Desabilite a Object.prototype.__proto__propriedade usando --disable-protosinalizador.
Verifique se a propriedade existe diretamente no objeto, não no protótipo usando Object.hasOwn(obj, keyFromObj).
Evite usar métodos de Object.prototype.
Elemento de caminho de pesquisa não controlado (CWE-427)
O Node.js carrega módulos seguindo o Algoritmo de Resolução de Módulos . Portanto, ele assume que o diretório no qual um módulo é solicitado (require) é confiável.

Com isso, significa que o seguinte comportamento do aplicativo é esperado. Supondo a seguinte estrutura de diretórios:

aplicativo/
server.js
auth.js
autenticação
Se server.js usar, require('./auth')ele seguirá o algoritmo de resolução do módulo e carregará auth em vez de auth.js .

Mitigações

Usar o mecanismo de política experimental ¹ com verificação de integridade pode evitar a ameaça acima. Para o diretório descrito acima, pode-se usar o seguintepolicy.json

{
  "resources": {
    "./app/auth.js": {
      "integrity": "sha256-iuGZ6SFVFpMuHUcJciQTIKpIyaQVigMZlvg9Lx66HV8="
    },
    "./app/server.js": {
      "dependencies": {
        "./auth" : "./app/auth.js"
      },
      "integrity": "sha256-NPtLCQ0ntPPWgfVEgX46ryTNpdvTWdQPoZO3kHo0bKI="
    }
  }
}
Portanto, ao solicitar o módulo auth , o sistema validará a integridade e lançará um erro se não corresponder ao esperado.

» node --experimental-policy=policy.json app/server.js
node:internal/policy/sri:65
      throw new ERR_SRI_PARSE(str, str[prevIndex], prevIndex);
      ^

SyntaxError [ERR_SRI_PARSE]: Subresource Integrity string "sha256-iuGZ6SFVFpMuHUcJciQTIKpIyaQVigMZlvg9Lx66HV8=%" had an unexpected "%" at position 51
    at new NodeError (node:internal/errors:393:5)
    at Object.parse (node:internal/policy/sri:65:13)
    at processEntry (node:internal/policy/manifest:581:38)
    at Manifest.assertIntegrity (node:internal/policy/manifest:588:32)
    at Module._compile (node:internal/modules/cjs/loader:1119:21)
    at Module._extensions..js (node:internal/modules/cjs/loader:1213:10)
    at Module.load (node:internal/modules/cjs/loader:1037:32)
    at Module._load (node:internal/modules/cjs/loader:878:12)
    at Module.require (node:internal/modules/cjs/loader:1061:19)
    at require (node:internal/modules/cjs/helpers:99:18) {
  code: 'ERR_SRI_PARSE'
}
Observe que é sempre recomendável o uso de --policy-integritypara evitar mutações de política.

Recursos Experimentais em Produção
O uso de recursos experimentais em produção não é recomendado. Os recursos experimentais podem sofrer alterações importantes, se necessário, e sua funcionalidade não é estável com segurança. Embora, o feedback seja muito apreciado.

*/