/*

Gráficos de chama
Para que serve um gráfico de chama?
Gráficos de chama são uma forma de visualizar o tempo de CPU gasto em funções. Eles podem ajudá-lo a identificar onde você gasta muito tempo fazendo operações síncronas.

Como criar um gráfico de chama
Você deve ter ouvido que criar um gráfico de chama para Node.js é difícil, mas isso não é mais verdade. Solaris vms não são mais necessários para gráficos de chama!

Os gráficos de chama são gerados a partir perfda saída, que não é uma ferramenta específica do nó. Embora seja a maneira mais poderosa de visualizar o tempo de CPU gasto, pode haver problemas com a forma como o código JavaScript é otimizado no Node.js 8 e superior. Consulte a seção de problemas de saída perf abaixo.

Use uma ferramenta pré-embalada
Se você quiser uma única etapa que produza um gráfico de chama localmente, tente 0x

Para diagnosticar implantações de produção, leia estas notas: 0x servidores de produção

Crie um gráfico de chama com ferramentas de perf do sistema
O objetivo deste guia é mostrar as etapas envolvidas na criação de um gráfico de chama e mantê-lo no controle de cada etapa.

Se você quiser entender melhor cada passo, dê uma olhada nas seções a seguir, onde entramos em mais detalhes.

Agora vamos trabalhar.

Instalar perf(geralmente disponível através do pacote linux-tools-common se ainda não estiver instalado)

tente executar perf- ele pode reclamar da falta de módulos do kernel, instale-os também

execute o nó com o perf ativado (consulte os problemas de saída do perf para obter dicas específicas para as versões do Node.js)

perf record -e cycles:u -g -- node --perf-basic-prof app.js
desconsidere os avisos, a menos que eles digam que você não pode executar o perf devido a pacotes ausentes; você pode receber alguns avisos sobre não ser capaz de acessar amostras de módulos do kernel que você não está procurando de qualquer maneira.

Execute perf script > perfs.outpara gerar o arquivo de dados que você visualizará em instantes. É útil aplicar alguma limpeza para um gráfico mais legível

instale o stackvis se ainda não estiver instaladonpm i -g stackvis

correrstackvis perf < perfs.out > flamegraph.htm

Agora abra o arquivo do gráfico de chama em seu navegador favorito e observe-o queimar. É codificado por cores para que você possa se concentrar primeiro nas barras laranja mais saturadas. Eles provavelmente representam funções pesadas da CPU.

Vale a pena mencionar - se você clicar em um elemento de um gráfico de chama, um zoom de seus arredores será exibido acima do gráfico.

Usando perfpara amostrar um processo em execução
Isso é ótimo para gravar dados de gráfico de chama de um processo já em execução que você não deseja interromper. Imagine um processo de produção com um problema difícil de reproduzir.

perf record -F99 -p `pgrep -n node` -g -- sleep 3
Espera, para que sleep 3serve isso? Está lá para manter o perf rodando - apesar -pda opção apontar para um pid diferente, o comando precisa ser executado em um processo e terminar com ele. perf é executado durante a vida útil do comando que você passa para ele, esteja você realmente criando o perfil desse comando ou não. sleep 3garante que o perf seja executado por 3 segundos.

Por que (frequência de criação de perfil) está -Fdefinido como 99? É um padrão razoável. Você pode ajustar se quiser. -F99diz ao perf para obter 99 amostras por segundo, para maior precisão, aumente o valor. Valores mais baixos devem produzir menos saída com resultados menos precisos. A precisão que você precisa depende de quanto tempo suas funções intensivas de CPU realmente são executadas. Se você está procurando o motivo de uma desaceleração perceptível, 99 quadros por segundo devem ser mais do que suficientes.

Depois de obter o registro de desempenho de 3 segundos, prossiga com a geração do gráfico de chama com as duas últimas etapas acima.

Filtrando as funções internas do Node.js
Normalmente, você só quer observar o desempenho de suas próprias chamadas, portanto, filtrar as funções internas do Node.js e do V8 pode tornar o gráfico muito mais fácil de ler. Você pode limpar seu arquivo perf com:

sed -i \
  -e "/( __libc_start| LazyCompile | v8::internal::| Builtin:| Stub:| LoadIC:|\[unknown\]| LoadPolymorphicIC:)/d" \
  -e 's/ LazyCompile:[*~]\?/ /' \
  perfs.out
Se você ler seu gráfico de chama e parecer estranho, como se algo estivesse faltando na função-chave ocupando mais tempo, tente gerar seu gráfico de chama sem os filtros - talvez você tenha um caso raro de problema com o próprio Node.js.

Opções de criação de perfil do Node.js
--perf-basic-prof-only-functionse --perf-basic-profsão os dois úteis para depurar seu código JavaScript. Outras opções são usadas para criar o perfil do próprio Node.js, o que está fora do escopo deste guia.

--perf-basic-prof-only-functionsproduz menos saída, por isso é a opção com menos despesas gerais.

Por que eu preciso deles afinal?
Bem, sem essas opções, você ainda obterá um gráfico de chama, mas com a maioria das barras rotuladas como v8::Function::Call.

perfproblemas de saída
Alterações no pipeline do Node.js 8.x V8
O Node.js 8.xe superior é fornecido com novas otimizações para o pipeline de compilação JavaScript no mecanismo V8, o que às vezes torna os nomes/referências de função inacessíveis para perf. (Chama-se Turbofan)

O resultado é que você pode não obter os nomes de suas funções corretamente no gráfico de chama.

Você notará ByteCodeHandler:onde esperaria os nomes das funções.

0x tem algumas atenuações para isso.

Para detalhes, consulte:

https://github.com/nodejs/benchmarking/issues/168
https://github.com/nodejs/diagnostics/issues/148#issuecomment-369348961
Node.js 10+
Node.js 10.x resolve o problema com o Turbofan usando o --interpreted-frames-native-stacksinalizador.

Execute node --interpreted-frames-native-stack --perf-basic-prof-only-functionspara obter nomes de função no gráfico de chama, independentemente de qual pipeline V8 usado para compilar seu JavaScript.

Rótulos quebrados no gráfico de chama
Se você estiver vendo rótulos assim

node`_ZN2v88internal11interpreter17BytecodeGenerator15VisitStatementsEPNS0_8ZoneListIPNS0_9StatementEEE
isso significa que o Linux perf que você está usando não foi compilado com suporte demangle, veja https://bugs.launchpad.net/ubuntu/+source/linux/+bug/1396654 por exemplo

Exemplos
Pratique a captura de gráficos de chama com um exercício de gráfico de chama !

*/

