# CINEHOME---Homepage
Parte do homepage, tela principal.

## Integração TMDB (The Movie Database)

O projeto suporta busca de filmes via TMDB diretamente pela barra de pesquisa.

### Como configurar a chave de API

Para que a conexão funcione, é necessário ter uma chave de API do TMDB:

1. Crie uma conta em `https://www.themoviedb.org/` e obtenha sua API Key (v3).
2. Opções de configuração (frontend-only):

   a) Via `localStorage` (recomendado para desenvolvimento):

   - Abra o site local em seu navegador.
   - No console do navegador, execute:
     
     ```js
     localStorage.setItem('TMDB_API_KEY', 'SUA_CHAVE_AQUI');
     ```

   b) Via `config.js` (arquivo adicional):

   - Crie um arquivo `config.js` na raiz com:
     ```js
     window.TMDB_API_KEY = 'SUA_CHAVE_AQUI';
     ```
   - Importe-o em `index.html` antes de `script.js`.

   c) Via `.env` (apenas em servidor estático local que sirva arquivos brutos):
   
   - Crie/edite `./.env` com a linha:
     ```
     API_KEY=SUA_CHAVE_AQUI
     ```
   - Sirva o site com um servidor estático simples (ex.: Live Server do VS Code, `python -m http.server`, etc.), que permita `GET /.env`.
   - O frontend irá ler `/.env` automaticamente em ambientes locais (`localhost`, `127.0.0.1`, `192.168.x.x`). Em hospedagens públicas esse arquivo não deve ser exposto.

   Importante: em um site 100% estático não há como manter a chave verdadeiramente secreta. Evite usar esta abordagem em produção.

### Uso

- Digite o nome do filme na barra de pesquisa e pressione Enter ou clique no botão de busca.
- Os resultados serão exibidos em um carrossel abaixo do conteúdo principal.
 - As seções “Em alta — Filmes” e “Em alta — Séries” são preenchidas automaticamente se a chave estiver configurada.

### Observações

- A busca usa os endpoints da API v3 (ex.: `GET /search/{type}`, `GET /discover/{type}`, `GET /genre/{type}/list`, `GET /trending/{type}/week`) com `language=pt-BR` e `include_adult=false` onde aplicável.
- Em caso de erro (chave ausente, inválida ou problemas de rede), uma mensagem será exibida na área de resultados.
