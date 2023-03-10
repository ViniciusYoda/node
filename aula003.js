/*

Criação de perfil fácil para aplicativos Node.js
Existem muitas ferramentas de terceiros disponíveis para criação de perfil de aplicativos Node.js, mas, em muitos casos, a opção mais fácil é usar o criador de perfil interno do Node.js. O criador de perfil integrado usa o criador de perfil dentro do V8 , que amostra a pilha em intervalos regulares durante a execução do programa. Ele registra os resultados dessas amostras, juntamente com importantes eventos de otimização, como compilações jit, como uma série de ticks:

code-creation,LazyCompile,0,0x2d5000a337a0,396,"bp native array.js:1153:16",0x289f644df68,~
code-creation,LazyCompile,0,0x2d5000a33940,716,"hasOwnProperty native v8natives.js:198:30",0x289f64438d0,~
code-creation,LazyCompile,0,0x2d5000a33c20,284,"ToName native runtime.js:549:16",0x289f643bb28,~
code-creation,Stub,2,0x2d5000a33d40,182,"DoubleToIStub"
code-creation,Stub,2,0x2d5000a33e00,507,"NumberToStringStub"
Antigamente, você precisava do código-fonte V8 para poder interpretar os ticks. Felizmente, desde o Node.js 4.4.0 foram introduzidas ferramentas que facilitam o consumo dessas informações sem compilar V8 separadamente da fonte. Vamos ver como o criador de perfil integrado pode ajudar a fornecer informações sobre o desempenho do aplicativo.

Para ilustrar o uso do tick profiler, trabalharemos com um aplicativo Express simples. Nossa aplicação terá dois handlers, um para adicionar novos usuários ao nosso sistema:

*/

app.get('/newUser', (req, res) => {
    let username = req.query.username || '';
    const password = req.query.password || '';

    username = username.replace(/[!@#$%^&*]/g, '');

    if (!username || !password || users[username]) {
        return res.sendStatus(400);
      
    }

    const salt = crypto.randomBytes(128).toString('base64');
    const hash = crypto.pbkdf2Sync(password, salt, 10000, 512, 'sha512');

    
  users[username] = { salt, hash };

  res.sendStatus(200);
});

// e outro para validar as tentativas de autenticação do usuário:

app.get('/auth', (req, res) => {
    let username = req.query.username || '';
    const password = req.query.password || '';
  
    username = username.replace(/[!@#$%^&*]/g, '');
  
    if (!username || !password || !users[username]) {
      return res.sendStatus(400);
    }
  
    const { salt, hash } = users[username];
    const encryptHash = crypto.pbkdf2Sync(password, salt, 10000, 512, 'sha512');
  
    if (crypto.timingSafeEqual(hash, encryptHash)) {
      res.sendStatus(200);
    } else {
      res.sendStatus(401);
    }
});

/*

Observe que esses NÃO são manipuladores recomendados para autenticar usuários em seus aplicativos Node.js e são usados ​​apenas para fins de ilustração. Você não deve tentar projetar seus próprios mecanismos de autenticação criptográfica em geral. É muito melhor usar soluções de autenticação existentes e comprovadas.

Agora suponha que implantamos nosso aplicativo e os usuários estão reclamando da alta latência nas solicitações. Podemos executar facilmente o aplicativo com o criador de perfil integrado:

NODE_ENV=production node --prof app.js
e coloque alguma carga no servidor usando ab(ApacheBench):

curl -X GET "http://localhost:8080/newUser?username=matt&password=password"
ab -k -c 20 -n 250 "http://localhost:8080/auth?username=matt&password=password"
e obter uma saída ab de:

Concurrency Level:      20
Time taken for tests:   46.932 seconds
Complete requests:      250
Failed requests:        0
Keep-Alive requests:    250
Total transferred:      50250 bytes
HTML transferred:       500 bytes
Requests per second:    5.33 [#/sec] (mean)
Time per request:       3754.556 [ms] (mean)
Time per request:       187.728 [ms] (mean, across all concurrent requests)
Transfer rate:          1.05 [Kbytes/sec] received

...

Percentage of the requests served within a certain time (ms)
  50%   3755
  66%   3804
  75%   3818
  80%   3825
  90%   3845
  95%   3858
  98%   3874
  99%   3875
 100%   4225 (longest request)
A partir dessa saída, vemos que estamos conseguindo atender apenas cerca de 5 solicitações por segundo e que a solicitação média leva pouco menos de 4 segundos de ida e volta. Em um exemplo do mundo real, poderíamos estar fazendo muito trabalho em muitas funções em nome de uma solicitação do usuário, mas mesmo em nosso exemplo simples, o tempo poderia ser perdido compilando expressões regulares, gerando salts aleatórios, gerando hashes exclusivos de senhas de usuário ou dentro da própria estrutura do Express.

Como executamos nosso aplicativo usando a --profopção, um arquivo tick foi gerado no mesmo diretório da execução local do aplicativo. Deve ter a forma isolate-0xnnnnnnnnnnnn-v8.log(onde né um dígito).

Para entender esse arquivo, precisamos usar o processador de ticks incluído no binário Node.js. Para executar o processador, use o --prof-processsinalizador:

node --prof-process isolate-0xnnnnnnnnnnnn-v8.log > processed.txt
Abrir o arquivoprocess.txt em seu editor de texto favorito fornecerá alguns tipos diferentes de informações. O arquivo é dividido em seções que são novamente divididas por idioma. Primeiro, olhamos para a seção de resumo e vemos:

 [Summary]:
   ticks  total  nonlib   name
     79    0.2%    0.2%  JavaScript
  36703   97.2%   99.2%  C++
      7    0.0%    0.0%  GC
    767    2.0%          Shared libraries
    215    0.6%          Unaccounted
Isso nos diz que 97% de todas as amostras coletadas ocorreram em código C++ e que, ao visualizar outras seções da saída processada, devemos prestar mais atenção ao trabalho que está sendo feito em C++ (em oposição ao JavaScript). Com isso em mente, a seguir encontramos a seção [C++] que contém informações sobre quais funções C++ estão consumindo mais tempo de CPU e veja:

 [C++]:
   ticks  total  nonlib   name
  19557   51.8%   52.9%  node::crypto::PBKDF2(v8::FunctionCallbackInfo<v8::Value> const&)
   4510   11.9%   12.2%  _sha1_block_data_order
   3165    8.4%    8.6%  _malloc_zone_malloc
Vemos que as 3 principais entradas respondem por 72,1% do tempo de CPU consumido pelo programa. A partir dessa saída, vemos imediatamente que pelo menos 51,8% do tempo da CPU é ocupado por uma função chamada PBKDF2, que corresponde à nossa geração de hash a partir da senha de um usuário. No entanto, pode não ser imediatamente óbvio como as duas entradas inferiores são fatoradas em nosso aplicativo (ou, se for, fingiremos o contrário para fins de exemplo). Para entender melhor a relação entre essas funções, veremos a seguir a seção [Perfil ascendente (pesado)] que fornece informações sobre os principais chamadores de cada função. Examinando esta seção, encontramos:

   ticks parent  name
  19557   51.8%  node::crypto::PBKDF2(v8::FunctionCallbackInfo<v8::Value> const&)
  19557  100.0%    v8::internal::Builtins::~Builtins()
  19557  100.0%      LazyCompile: ~pbkdf2 crypto.js:557:16

   4510   11.9%  _sha1_block_data_order
   4510  100.0%    LazyCompile: *pbkdf2 crypto.js:557:16
   4510  100.0%      LazyCompile: *exports.pbkdf2Sync crypto.js:552:30

   3165    8.4%  _malloc_zone_malloc
   3161   99.9%    LazyCompile: *pbkdf2 crypto.js:557:16
   3161  100.0%      LazyCompile: *exports.pbkdf2Sync crypto.js:552:30
Analisar esta seção exige um pouco mais de trabalho do que as contagens brutas de ticks acima. Dentro de cada uma das "pilhas de chamada" acima, a porcentagem na coluna pai informa a porcentagem de amostras para as quais a função na linha acima foi chamada pela função na linha atual. Por exemplo, no meio da "pilha de chamadas" acima para _sha1_block_data_order, vemos que _sha1_block_data_orderocorreu em 11,9% das amostras, o que sabíamos das contagens brutas acima. No entanto, aqui também podemos dizer que ele sempre foi chamado pela função pbkdf2 dentro do módulo de criptografia do Node.js. Vemos que da mesma forma,_malloc_zone_mallocfoi chamado quase exclusivamente pela mesma função pbkdf2. Assim, usando as informações nesta exibição, podemos dizer que nosso cálculo de hash da senha do usuário representa não apenas os 51,8% acima, mas também todo o tempo de CPU nas 3 principais funções mais amostradas desde as chamadas para e foram _sha1_block_data_orderfeitas _malloc_zone_mallocem nome da função pbkdf2.

Neste ponto, está muito claro que a geração de hash baseada em senha deve ser o alvo de nossa otimização. Felizmente, você internalizou totalmente os benefícios da programação assíncrona e percebeu que o trabalho para gerar um hash da senha do usuário está sendo feito de maneira síncrona e, assim, amarrando o loop de eventos. Isso nos impede de trabalhar em outras solicitações recebidas enquanto calculamos um hash.

Para solucionar esse problema, faça uma pequena modificação nos manipuladores acima para usar a versão assíncrona da função pbkdf2:

*/

app.get('/auth', (req, res) => {
    let username = req.query.username || '';
    const password = req.query.password || '';
  
    username = username.replace(/[!@#$%^&*]/g, '');
  
    if (!username || !password || !users[username]) {
      return res.sendStatus(400);
    }
  
    crypto.pbkdf2(password, users[username].salt, 10000, 512, 'sha512', (err, hash) => {
      if (users[username].hash.toString() === hash.toString()) {
        res.sendStatus(200);
      } else {
        res.sendStatus(401);
      }
    });
});

/*

Uma nova execução do benchmark ab acima com a versão assíncrona do seu aplicativo produz:

Concurrency Level:      20
Time taken for tests:   12.846 seconds
Complete requests:      250
Failed requests:        0
Keep-Alive requests:    250
Total transferred:      50250 bytes
HTML transferred:       500 bytes
Requests per second:    19.46 [#/sec] (mean)
Time per request:       1027.689 [ms] (mean)
Time per request:       51.384 [ms] (mean, across all concurrent requests)
Transfer rate:          3.82 [Kbytes/sec] received

...

Percentage of the requests served within a certain time (ms)
  50%   1018
  66%   1035
  75%   1041
  80%   1043
  90%   1049
  95%   1063
  98%   1070
  99%   1071
 100%   1079 (longest request)
Yay! Seu aplicativo agora atende a cerca de 20 solicitações por segundo, aproximadamente 4 vezes mais do que com a geração de hash síncrona. Além disso, a latência média caiu dos 4 segundos anteriores para pouco mais de 1 segundo.

Esperançosamente, por meio da investigação de desempenho deste exemplo (reconhecidamente inventado), você viu como o processador de ticks V8 pode ajudá-lo a entender melhor o desempenho de seus aplicativos Node.js.

Você também pode achar útil como criar um gráfico de chama .

*/