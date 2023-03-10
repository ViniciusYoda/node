/*

Guia de depuração
Este guia ajudará você a começar a depurar seus aplicativos e scripts Node.js.

Ativar Inspetor
Quando iniciado com o --inspectswitch, um processo Node.js escuta um cliente de depuração. Por padrão, ele escutará no host e na porta 127.0.0.1:9229. Cada processo também recebe um UUID exclusivo .

Os clientes Inspector devem conhecer e especificar o endereço do host, a porta e o UUID para se conectar. Um URL completo será algo como ws://127.0.0.1:9229/0f2c936f-b1cd-4ac9-aab3-f63b0f33d55e.

O Node.js também começará a ouvir as mensagens de depuração se receber um SIGUSR1sinal. ( SIGUSR1não está disponível no Windows.) No Node.js 7 e anterior, isso ativa a API do depurador herdada. No Node.js 8 e posterior, ele ativará a API do Inspetor.

Implicações de segurança
Como o depurador tem acesso total ao ambiente de execução do Node.js, um ator mal-intencionado capaz de se conectar a essa porta pode executar código arbitrário em nome do processo do Node.js. É importante entender as implicações de segurança de expor a porta do depurador em redes públicas e privadas.

Expor a porta de depuração publicamente não é seguro
Se o depurador estiver vinculado a um endereço IP público ou a 0.0.0.0, todos os clientes que puderem acessar seu endereço IP poderão se conectar ao depurador sem qualquer restrição e poderão executar código arbitrário.

Por padrão, node --inspectliga-se a 127.0.0.1. Você precisa fornecer explicitamente um endereço IP público ou 0.0.0.0, etc., se pretende permitir conexões externas ao depurador. Fazer isso pode expor você a uma ameaça de segurança potencialmente significativa. Sugerimos que você garanta firewalls e controles de acesso adequados para evitar uma exposição de segurança.

Consulte a seção ' Habilitando cenários de depuração remota ' para obter alguns conselhos sobre como permitir a conexão segura de clientes de depuração remota.

Aplicações locais têm acesso total ao inspetor
Mesmo se você vincular a porta do inspetor a 127.0.0.1 (o padrão), todos os aplicativos executados localmente em sua máquina terão acesso irrestrito. Isso ocorre por design para permitir que os depuradores locais possam se conectar convenientemente.

Navegadores, WebSockets e política de mesma origem
Os sites abertos em um navegador da Web podem fazer solicitações WebSocket e HTTP no modelo de segurança do navegador. Uma conexão HTTP inicial é necessária para obter um ID de sessão de depurador exclusivo. A política de mesma origem impede que sites possam fazer essa conexão HTTP. Para segurança adicional contra ataques de religação de DNS , o Node.js verifica se os cabeçalhos 'Host' da conexão especificam um endereço IP ou localhostprecisamente.

Essas políticas de segurança não permitem a conexão com um servidor de depuração remoto especificando o nome do host. Você pode contornar essa restrição especificando o endereço IP ou usando túneis ssh conforme descrito abaixo.

Clientes Inspetores
Um depurador CLI mínimo está disponível com node inspect myscript.js. Várias ferramentas comerciais e de código aberto também podem se conectar ao Node.js Inspector.

Chrome DevTools 55+, Microsoft Edge
Opção 1 : abra chrome://inspectem um navegador baseado no Chromium ou edge://inspectno Edge. Clique no botão Configurar e verifique se o host e a porta de destino estão listados.
Opção 2 : Copie o devtoolsFrontendUrlda saída de /json/list (veja acima) ou o texto da dica --inspect e cole no Chrome.
Observe que o Node.js e o Chrome precisam ser executados na mesma plataforma.

Código do Visual Studio 1.10+
No painel Debug, clique no ícone de configurações para abrir .vscode/launch.json. Selecione "Node.js" para a configuração inicial.
Visual Studio 2017+
Escolha "Depurar > Iniciar Depuração" no menu ou pressione F5.
Instruções detalhadas .
JetBrains WebStorm e outros IDEs JetBrains
Crie uma nova configuração de depuração do Node.js e clique em Debug. --inspectserá usado por padrão para Node.js 7+. Para desabilitar, desmarque js.debugger.node.use.inspectno Registro do IDE. Para saber mais sobre como executar e depurar Node.js no WebStorm e outros IDEs JetBrains, confira a ajuda on-line do WebStorm .
interface remota cromada
Biblioteca para facilitar as conexões com os endpoints do Inspector Protocol .
GitpodGenericName
Inicie uma configuração de depuração do Node.js na Debugvisualização ou clique em F5. Instruções detalhadas
Eclipse IDE com extensão Eclipse Wild Web Developer
Em um arquivo .js, escolha "Depurar como... > Programa do nó" ou
Crie uma configuração de depuração para anexar o depurador ao aplicativo Node.js em execução (já iniciado com --inspect).
Opções de linha de comando
A tabela a seguir lista o impacto de vários sinalizadores de tempo de execução na depuração:

Habilitando cenários de depuração remota
Recomendamos que você nunca deixe o depurador escutar em um endereço IP público. Se você precisar permitir conexões de depuração remota, recomendamos o uso de túneis ssh. Fornecemos o exemplo a seguir apenas para fins ilustrativos. Entenda o risco de segurança de permitir o acesso remoto a um serviço privilegiado antes de prosseguir.

Digamos que você esteja executando o Node.js em uma máquina remota, remote.example.com, que deseja depurar. Nessa máquina, você deve iniciar o processo do nó com o inspetor ouvindo apenas localhost (o padrão).

node --inspect server.js
Agora, em sua máquina local de onde você deseja iniciar uma conexão de cliente de depuração, você pode configurar um túnel ssh:

ssh -L 9221:localhost:9229 user@remote.example.com
Isso inicia uma sessão de túnel ssh em que uma conexão com a porta 9221 em sua máquina local será encaminhada para a porta 9229 em remote.example.com. Agora você pode anexar um depurador como Chrome DevTools ou Visual Studio Code para localhost:9221, que deve ser capaz de depurar como se o aplicativo Node.js estivesse sendo executado localmente.

Depurador herdado
O depurador herdado foi preterido a partir do Node.js 7.7.0. Em vez disso , use --inspecte Inspector.

Quando iniciado com as opções --debug ou --debug-brk na versão 7 e anteriores, o Node.js escuta os comandos de depuração definidos pelo protocolo de depuração V8 descontinuado em uma porta TCP, por padrão 5858. Qualquer cliente depurador que fale este protocolo pode se conectar e depurar o processo em execução; alguns populares estão listados abaixo.

O protocolo de depuração V8 não é mais mantido ou documentado.

[Depurador integrado]( https://nodejs.org/dist/{#var currentVersion}/docs/api/debugger.html)
Comece node debug script_name.jsa iniciar seu script no depurador de linha de comando integrado. Seu script começa em outro processo Node.js iniciado com a --debug-brkopção e o processo Node.js inicial executa o _debugger.js script e se conecta ao seu destino.

nó-inspetor
Depure seu aplicativo Node.js com o Chrome DevTools usando um processo intermediário que converte o Inspector Protocol usado no Chromium para o protocolo V8 Debugger usado no Node.js.

*/