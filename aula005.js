/*

Dockerizando um aplicativo da web Node.js
O objetivo deste exemplo é mostrar como colocar um aplicativo Node.js em um contêiner Docker. O guia destina-se ao desenvolvimento e não a uma implantação de produção. O guia também pressupõe que você tenha uma instalação do Docker funcionando e um entendimento básico de como um aplicativo Node.js é estruturado.

Na primeira parte deste guia, criaremos um aplicativo Web simples em Node.js, depois criaremos uma imagem do Docker para esse aplicativo e, por último, instanciaremos um contêiner a partir dessa imagem.

O Docker permite empacotar um aplicativo com seu ambiente e todas as suas dependências em uma "caixa", chamada de contêiner. Normalmente, um contêiner consiste em um aplicativo executado em uma versão simplificada de um sistema operacional Linux. Uma imagem é o projeto de um contêiner, um contêiner é uma instância em execução de uma imagem.

Criar o aplicativo Node.js
Primeiro, crie um novo diretório onde todos os arquivos residiriam. Neste diretório, crie um package.jsonarquivo que descreva seu aplicativo e suas dependências:

{
  "name": "docker_web_app",
  "version": "1.0.0",
  "description": "Node.js on Docker",
  "author": "First Last <first.last@example.com>",
  "main": "server.js",
  "scripts": {
    "start": "node server.js"
  },
  "dependencies": {
    "express": "^4.16.1"
  }
}
Com seu novo package.jsonarquivo, execute npm install. Se você estiver usando npm a versão 5 ou posterior, isso gerará um package-lock.jsonarquivo que será copiado para sua imagem do Docker.

Em seguida, crie um server.jsarquivo que defina um aplicativo da Web usando a estrutura Express.js :

'use strict';

const express = require('express');

// Constants
const PORT = 8080;
const HOST = '0.0.0.0';

// App
const app = express();
app.get('/', (req, res) => {
  res.send('Hello World');
});

app.listen(PORT, HOST, () => {
  console.log(`Running on http://${HOST}:${PORT}`);
});
Nas próximas etapas, veremos como você pode executar esse aplicativo dentro de um contêiner Docker usando a imagem oficial do Docker. Primeiro, você precisará criar uma imagem do Docker do seu aplicativo.

Criando um Dockerfile
Crie um arquivo vazio chamado Dockerfile:

touch Dockerfile
Abra o Dockerfileno seu editor de texto favorito

A primeira coisa que precisamos fazer é definir a partir de qual imagem queremos construir. Aqui, usaremos a versão LTS (suporte de longo prazo) mais recente 16disponível node no Docker Hub :

FROM node:16
Em seguida, criamos um diretório para armazenar o código do aplicativo dentro da imagem, este será o diretório de trabalho do seu aplicativo:

# Create app directory
WORKDIR /usr/src/app
Esta imagem vem com o Node.js e o NPM já instalados, então a próxima coisa que precisamos fazer é instalar as dependências do seu aplicativo usando o npmbinário. Observe que, se você estiver usando npma versão 4 ou anterior, um package-lock.json arquivo não será gerado.

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY package*.json ./

RUN npm install
# If you are building your code for production
# RUN npm ci --only=production
Observe que, em vez de copiar todo o diretório de trabalho, estamos copiando apenas o package.jsonarquivo. Isso nos permite aproveitar as camadas do Docker armazenadas em cache. bitJudo tem uma boa explicação sobre isso aqui . Além disso, o npm cicomando, especificado nos comentários, ajuda a fornecer construções mais rápidas, confiáveis ​​e reproduzíveis para ambientes de produção. Você pode ler mais sobre isso aqui .

Para agrupar o código-fonte do seu aplicativo dentro da imagem do Docker, use a COPY instrução:

# Bundle app source
COPY . .
Seu aplicativo se vincula à porta 8080, então você usará a EXPOSEinstrução para mapeá-lo pelo dockerdaemon:

EXPOSE 8080
Por último, mas não menos importante, defina o comando para executar seu aplicativo usando CMDo qual define seu tempo de execução. Aqui vamos usar node server.jspara iniciar seu servidor:

CMD [ "node", "server.js" ]
Agora você Dockerfiledeve ficar assim:

FROM node:16

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY package*.json ./

RUN npm install
# If you are building your code for production
# RUN npm ci --only=production

# Bundle app source
COPY . .

EXPOSE 8080
CMD [ "node", "server.js" ]
arquivo .dockerignore
Crie um .dockerignorearquivo no mesmo diretório que o seu Dockerfile com o seguinte conteúdo:

node_modules
npm-debug.log
Isso impedirá que seus módulos locais e logs de depuração sejam copiados para sua imagem do Docker e possivelmente substituam os módulos instalados em sua imagem.

Construindo sua imagem
Vá para o diretório que contém o seu Dockerfilee execute o seguinte comando para criar a imagem do Docker. A -tbandeira permite que você marque sua imagem para que seja mais fácil encontrá-la mais tarde usando o docker imagescomando:

docker build . -t <your username>/node-web-app
Sua imagem agora será listada pelo Docker:

$ docker images

# Example
REPOSITORY                      TAG        ID              CREATED
node                            16         3b66eb585643    5 days ago
<your username>/node-web-app    latest     d64d3505b0d2    1 minute ago
Execute a imagem
Executar sua imagem com -dexecuta o contêiner no modo desanexado, deixando o contêiner em execução em segundo plano. A -pflag redireciona uma porta pública para uma porta privada dentro do container. Execute a imagem que você criou anteriormente:

docker run -p 49160:8080 -d <your username>/node-web-app
Imprima a saída do seu aplicativo:

# Get container ID
$ docker ps

# Print app output
$ docker logs <container id>

# Example
Running on http://localhost:8080
Se precisar entrar no container pode usar o execcomando:

# Enter the container
$ docker exec -it <container id> /bin/bash
Teste
Para testar seu aplicativo, obtenha a porta de seu aplicativo que o Docker mapeou:

$ docker ps

# Example
ID            IMAGE                                COMMAND    ...   PORTS
ecce33b30ebf  <your username>/node-web-app:latest  npm start  ...   49160->8080
No exemplo acima, o Docker mapeou a 8080porta dentro do contêiner para a porta 49160em sua máquina.

Agora você pode chamar seu aplicativo usando curl(instale se necessário via sudo apt-get install curl:):

$ curl -i localhost:49160

HTTP/1.1 200 OK
X-Powered-By: Express
Content-Type: text/html; charset=utf-8
Content-Length: 12
ETag: W/"c-M6tWOb/Y57lesdjQuHeB1P/qTV0"
Date: Mon, 13 Nov 2017 20:53:59 GMT
Connection: keep-alive

Hello world
Desligue a imagem
Para desligar o aplicativo que iniciamos, executamos o killcomando. Isso usa o ID do contêiner, que neste exemplo era ecce33b30ebf.

# Kill our running container
$ docker kill <container id>
<container id>

# Confirm that the app has stopped
$ curl -i localhost:49160
curl: (7) Failed to connect to localhost port 49160: Connection refused
Esperamos que este tutorial tenha ajudado você a começar a executar um aplicativo Node.js simples no Docker.

Você pode encontrar mais informações sobre Docker e Node.js no Docker nos seguintes locais:

Imagem oficial do Node.js Docker
Guia de práticas recomendadas do Node.js Docker
Documentação oficial do Docker
Tag do Docker no Stack Overflow
Docker Subreddit

*/

