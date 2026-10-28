# Catálogo de estabelecimentos e cardápios

Este contexto descreve como as pessoas encontram estabelecimentos de comida e bebida e consultam seus cardápios. A consulta é pública e não cria pedidos dentro do app.

## Pessoas e estabelecimentos

**Visitante**:
Pessoa que consulta estabelecimentos e cardápios sem criar uma conta.
_Avoid_: usuário comum, cliente

**Conta do estabelecimento**:
Acesso por e-mail e senha usado para cadastrar e manter o perfil e o cardápio de um estabelecimento. No MVP, cada estabelecimento tem uma conta de gestão.
_Avoid_: conta de usuário, conta do restaurante

**Estabelecimento**:
Negócio de comida ou bebida publicado no catálogo, associado a um único endereço no MVP. Pode ser restaurante, café, bar, lanchonete ou confeitaria; seu perfil inclui nome, tipo de comida e horário, com descrição, foto e contato opcionais.
_Avoid_: restaurante (quando se referir ao cadastro público), filial, unidade

**Horário de funcionamento**:
Agenda semanal que informa quando o estabelecimento está aberto, com mais de um intervalo por dia e opção de fechamento temporário. Estabelecimentos fechados continuam visíveis no catálogo.
_Avoid_: disponibilidade para pedidos

**Tipo de comida**:
Classificação escolhida pelo estabelecimento a partir de opções disponíveis, com possibilidade de indicar mais de um tipo e selecionar “Outro”.
_Avoid_: categoria do cardápio

## Catálogo

**Cardápio**:
Conjunto publicado de comidas e bebidas de um estabelecimento, organizado em categorias editáveis pelo estabelecimento.
_Avoid_: pedido

**Categoria do cardápio**:
Grupo nomeado que reúne itens relacionados, como entradas, pratos executivos ou bebidas e drinks. O estabelecimento pode criar, renomear e remover categorias.
_Avoid_: página

**Item do cardápio**:
Comida ou bebida identificada por nome e preço; descrição e foto são opcionais.
_Avoid_: produto (quando se referir a uma entrada do cardápio)

**Item indisponível**:
Item que continua visível no cardápio, mas está temporariamente indisponível para o estabelecimento.
_Avoid_: item removido

**Alteração publicada**:
Mudança de perfil ou cardápio que fica visível aos visitantes assim que o estabelecimento salva.
_Avoid_: rascunho

**Perfil publicado**:
Perfil visível no catálogo depois da confirmação do e-mail, do preenchimento dos dados obrigatórios e do cadastro de pelo menos uma categoria com um item.
_Avoid_: perfil incompleto

**Perto de mim**:
Forma de ordenar estabelecimentos pela distância em linha reta a partir da localização do visitante, sem um limite fixo de distância.
_Avoid_: raio de entrega

**Pesquisa global**:
Busca estabelecimentos por nome, cidade ou bairro, tipo de comida e pratos, incluindo resultados fora da região atual do visitante.
_Avoid_: busca local

**Atalho de contato**:
Link do perfil do estabelecimento que abre uma ligação, conversa no WhatsApp ou rota no mapa fora do app. Telefone e WhatsApp são opcionais; o endereço permite abrir a rota.
_Avoid_: pedido, checkout
