# Tier Role 📍 ⭐ `v1.0.0`

> Aplicativo mobile para catalogar, avaliar e descobrir os melhores rolês e locais gastronômicos com a sua galera, com sistema de notas, fotos, tags dinâmicas e mapas interativos.

![Version](https://img.shields.io/badge/version-1.0.0-FF6B4A?style=for-the-badge)
![Expo](https://img.shields.io/badge/Expo_SDK_57-000020?style=for-the-badge&logo=expo&logoColor=white)
![React Native](https://img.shields.io/badge/React_Native_0.86-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Firebase](https://img.shields.io/badge/Firebase_12-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript_6-3178C6?style=for-the-badge&logo=typescript&logoColor=white)

---

## 📱 Principais Funcionalidades

### 🗺️ Mapas e Geolocalização Interativa (Sem Custos de API)
* **Alternador Lista / Mapa na Home:** Alterne entre a listagem tradicional de cards (`📋`) e o mapa interativo (`🗺️`) através de abas no topo ou pelo botão flutuante inferior estilo Airbnb.
* **Pinos Interativos:** Todos os locais cadastrados com endereço/coordenadas aparecem no mapa com pinos personalizados. Ao clicar no pino, é exibido um card de prévia com navegação direta para a tela do local.
* **Filtros em Tempo Real no Mapa:** Filtre simultaneamente por nome e por tags (ex.: `#hamburgueria`, `#bar`) diretamente sobre o mapa.
* **Sincronização Automática ao Criar Local:** Conforme você digita o endereço, o sistema geocodifica o texto em tempo real (com debounce), abrindo o mapa e posicionando o marcador automaticamente.
* **Modo Tela Cheia no Cadastro:** Opção de abrir o mapa em tela cheia com campo de busca próprio para posicionar o pino com máxima precisão.
* **Controles Fáceis com um Dedo:** Botões flutuantes de Zoom (`+` e `−`), centralizar no pino (`🎯`), enquadrar todos os locais salvos e centralização no GPS atual (`📍`).
* **Ver no GPS Externo:** Botão direto para traçar rotas e abrir o local no Google Maps ou Apple Maps.

### 🍽️ Cadastro e Gestão de Locais
* **Fotos de Capa:** Seleção de imagens com compressão e otimização automática (`expo-image-manipulator`) antes do upload no Firebase Storage.
* **Tags Inteligentes:** Crie e associe tags para categorizar os rolês.
* **Limpeza Automática de Tags:** Caso um local seja deletado e alguma tag fique sem nenhum local associado, ela é removida instantaneamente do banco.
* **Exclusão Democrática por Votação:** Sistema colaborativo onde usuários votam para deletar um local. O local só é excluído se mais da metade dos usuários registrados votarem favoravelmente. Ao ser deletado, as fotos correspondentes no Storage são apagadas automaticamente.

### ⭐ Avaliações e Sistema de Notas (Tier List)
* **Notas de 0 a 10:** Seletor intuitivo de notas com cores dinâmicas por categoria de qualidade (>= 7.5 Verde, >= 5 Amarelo, < 5 Vermelho).
* **Média Automática:** Cálculo em tempo real da nota média e total de avaliações de cada local.
* **Opinião e Fotos:** Espaço para comentários detalhados e foto da experiência do usuário no rolê.

### 🔍 Filtros Avançados e Ordenação Inteligente
* **Ordenação Múltipla:** Ordene os rolês por:
  * 🕒 **Mais novo adicionado** (Recentes primeiro);
  * 📅 **Mais velho adicionado** (Antigos primeiro);
  * ⭐ **Nota total do local** (Melhores notas primeiro, com desempate por total de avaliações);
  * 🔤 **Nome do local (A-Z)** (Ordem alfabética).
* **Filtro por Nota Total:** Filtre instantaneamente por faixas de avaliação:
  * ✨ Todas as notas;
  * 🟢 Top Tier (★ 7.5 a 10);
  * 🟡 Médio (★ 5.0 a 7.4);
  * 🔴 Abaixo de 5.0 (< ★ 5.0);
  * ⚪ Ainda sem avaliações (Locais novos).
* **Sincronização Lista & Mapa:** Toda ordenação e filtro por nota reflete simultaneamente na listagem e nos pinos do mapa.

### 🛡️ Usabilidade Mobile e Ergonomia
* **Prevenção de Teclado Ocultando Inputs:** Detecção dinâmica da altura do teclado com auto-scroll inteligente para inputs inferiores (como o campo de *Descrição*).
* **Scroll Desacoplado no Mapa:** O scroll da página é pausado automaticamente enquanto o usuário manuseia o mapa com o dedo, evitando conflitos de gestos.
* **Feedback Tátil:** Efeitos hápticos (`expo-haptics`) em toques, confirmações e avisos de erro.
* **Design Dark Premium:** Interface escura moderna, com contrastes calibrados, glassmorphism e sombras refinadas.

---

## 🛠️ Tecnologias Utilizadas

* **Framework:** [Expo SDK 57](https://expo.dev) com [React Native 0.86](https://reactnative.dev) e React 19.
* **Navegação:** [Expo Router](https://docs.expo.dev/router/introduction/) (roteamento baseado em sistema de arquivos).
* **Linguagem:** [TypeScript](https://www.typescriptlang.org/) com tipagem estrita e validação contínua.
* **Backend as a Service:** [Firebase](https://firebase.google.com/):
  * **Firebase Authentication:** Sessões seguras com persistência em `AsyncStorage`.
  * **Cloud Firestore:** Banco de dados NoSQL com índices otimizados para paginação e busca.
  * **Firebase Storage:** Armazenamento seguro de fotos de capas e avaliações.
* **Mapas e Geocodificação:**
  * **Leaflet & OpenStreetMap:** Renderizado nativamente via `react-native-webview` (sem custos de chaves de API ou cobrança Google Cloud).
  * **Nominatim API & Expo Location:** Geocodificação direta (endereço ➔ coordenadas) e reversa (coordenadas ➔ endereço).
* **Gerenciamento de Estado de Dados:** [TanStack React Query v5](https://tanstack.com/query/latest) para cache, revalidação e paginação infinita.

---

## 🚀 Como Executar o Projeto

### Pré-requisitos
* Node.js (v18 ou superior recomendado)
* npm, yarn ou bun
* App **Expo Go** instalado no celular (Android ou iOS) ou emulador configurado.

### 1. Clonar o repositório e instalar dependências
```bash
git clone https://github.com/carloterzaghi/tier-role.git
cd tier-role
npm install
```

### 2. Configurar as variáveis de ambiente
Crie um arquivo `.env` na raiz do projeto com base no arquivo [.env.example](file:///.env.example):

```env
EXPO_PUBLIC_FIREBASE_API_KEY=sua-api-key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=seu-projeto.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=seu-projeto
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=seu-projeto.firebasestorage.app
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=seu-messaging-sender-id
EXPO_PUBLIC_FIREBASE_APP_ID=seu-app-id
```

### 3. Iniciar o servidor de desenvolvimento
```bash
npx expo start
```
Escaneie o QR Code gerado usando o app **Expo Go** no celular ou pressione `a` para Android / `i` para iOS.

---

## 🧪 Qualidade de Código e Comandos

```bash
# Executar verificação de tipos (TypeScript)
npx tsc --noEmit

# Executar linter do projeto
npx expo lint

# Diagnosticar dependências e compatibilidade do Expo
npx expo-doctor
```

---

## 📁 Estrutura de Diretórios

```
tier-role/
├── src/
│   ├── app/                      # Rotas e telas do Expo Router
│   │   ├── (app)/                # Grupo autenticado
│   │   │   ├── index.tsx         # Tela principal (Home com Lista e Mapa)
│   │   │   ├── place/
│   │   │   │   ├── new.tsx       # Cadastro de novo local e geolocalização
│   │   │   │   └── [id].tsx      # Detalhes, mapa, avaliações e votação
│   │   │   │       └── review.tsx# Formulário de avaliação com nota e foto
│   │   │   └── _layout.tsx
│   │   ├── sign-in.tsx           # Tela de Login
│   │   ├── sign-up.tsx           # Tela de Cadastro
│   │   └── _layout.tsx           # Guardião de autenticação de rotas
│   ├── components/               # Componentes reutilizáveis
│   │   ├── places-map.tsx        # Mapa geral de locais salvos
│   │   ├── location-picker.tsx   # Seletor e mapa de ponto no cadastro
│   │   ├── place-card.tsx        # Card de local
│   │   ├── rating-selector.tsx   # Seletor de nota 0 a 10
│   │   ├── tag-chips.tsx         # Barra horizontal de tags
│   │   └── form.tsx              # Inputs, checkboxes e botões de formulário
│   ├── constants/                # Paleta de cores e temas (Brand)
│   ├── hooks/                    # Hooks de negócio e dados (usePlaces, useDebouncedValue)
│   └── lib/                      # Serviços Firebase, imagens, regras e haptics
├── firebase/                     # Regras de segurança (Firestore & Storage rules)
└── package.json
```

---

## 📄 Licença

Este projeto é de uso pessoal e privado. Desenvolvido por **Carlo Terzaghi** com ❤️ para os melhores rolês!
