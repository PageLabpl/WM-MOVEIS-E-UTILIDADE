/* =========================================================================
   WM Móveis & Utilidades — catálogo compartilhado
   Usado por index.html (vitrine) e product.html (página de produto).
   Se houver produtos cadastrados no Painel Admin (localStorage "wm_products"
   com showOnSite = true), eles substituem o catálogo de demonstração.
   ========================================================================= */

const FALLBACK_IMG = "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?q=80&w=800&auto=format&fit=crop";

const demoProducts = [
  {
    id: "d1", tag: "bestseller", category: "sala",
    name: "Mesa de Jantar 6 Lugares Tampo Vidro",
    price: 1299.90, oldPrice: 0, rating: 5, reviews: 128,
    images: [
      "https://images.unsplash.com/photo-1617104551722-3b2d51366400?q=80&w=900&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1617104678098-de229db51175?q=80&w=900&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1615874959474-d609969a20ed?q=80&w=900&auto=format&fit=crop"
    ],
    video: "",
    colors: [ {name:"Preto", hex:"#1c1c1c"}, {name:"Nogueira", hex:"#6b4423"} ],
    description: "Mesa de jantar para 6 lugares com tampo em vidro temperado de 10mm e estrutura em madeira maciça. Combina resistência e um acabamento elegante que se adapta tanto a ambientes clássicos quanto contemporâneos. Pés reforçados com sapatas antiderrapantes para proteger o piso."
  },
  {
    id: "d2", tag: "bestseller", category: "quarto",
    name: "Guarda Roupa Casal 3 Portas de Correr",
    price: 1899.90, oldPrice: 0, rating: 4.5, reviews: 96,
    images: [
      "https://images.unsplash.com/photo-1595428774223-ef52624120d2?q=80&w=900&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1595428774092-329e5dcb4d67?q=80&w=900&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1616627561950-9f746e330187?q=80&w=900&auto=format&fit=crop"
    ],
    video: "",
    colors: [ {name:"Branco", hex:"#f2f0ea"}, {name:"Preto", hex:"#1c1c1c"}, {name:"Carvalho", hex:"#a9835a"} ],
    description: "Guarda-roupa casal com 3 portas de correr e amplo espaço interno dividido em cabideiros, prateleiras e gaveteiro. Sistema de correr silencioso e portas com espelho central. Ideal para otimizar quartos de diferentes tamanhos."
  },
  {
    id: "d3", tag: "bestseller", category: "cozinha",
    name: "Kit Cozinha Compacta 6 Portas",
    price: 799.90, oldPrice: 0, rating: 4.5, reviews: 75,
    images: [
      "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?q=80&w=900&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1556911220-bff31c812dba?q=80&w=900&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1556909212-d5b604d0c90d?q=80&w=900&auto=format&fit=crop"
    ],
    video: "",
    colors: [ {name:"Branco", hex:"#f2f0ea"}, {name:"Cinza", hex:"#8a8a8a"} ],
    description: "Kit de armários compactos para cozinha com 6 portas, ideal para apartamentos e espaços reduzidos. Estrutura em MDP resistente à umidade, dobradiças reforçadas e organização interna com prateleiras ajustáveis."
  },
  {
    id: "d4", tag: "bestseller", category: "sala",
    name: "Sofá Retrátil e Reclinável 3 Lugares",
    price: 2199.90, oldPrice: 0, rating: 5, reviews: 210,
    images: [
      "https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?q=80&w=900&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1550254478-ead40cc54513?q=80&w=900&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1567016432779-094069958ea5?q=80&w=900&auto=format&fit=crop"
    ],
    video: "",
    colors: [ {name:"Cinza", hex:"#8a8a8a"}, {name:"Marrom", hex:"#5a3d2b"}, {name:"Bege", hex:"#d8c9a8"} ],
    description: "Sofá 3 lugares retrátil e reclinável, revestido em suede de alta durabilidade. Assentos com espuma D33 de alta densidade para conforto duradouro. Mecanismo reforçado testado para milhares de ciclos de uso."
  },
  {
    id: "d5", tag: "bestseller", category: "organizacao",
    name: "Caixa Organizadora Multiuso 30L",
    price: 49.90, oldPrice: 0, rating: 4.5, reviews: 54,
    images: [
      "https://images.unsplash.com/photo-1584538374887-f39e3fb03e7c?q=80&w=900&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1600585152220-90363fe7e115?q=80&w=900&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?q=80&w=900&auto=format&fit=crop"
    ],
    video: "",
    colors: [ {name:"Transparente", hex:"#d9d9d9"}, {name:"Preto", hex:"#1c1c1c"} ],
    description: "Caixa organizadora multiuso com capacidade de 30 litros, em polipropileno resistente a impactos. Tampa com trava de segurança e encaixe empilhável, ideal para organizar roupas, brinquedos e itens sazonais."
  },
  {
    id: "d6", tag: "launch", category: "sala",
    name: "Rack de TV Suspenso 180cm",
    price: 899.90, oldPrice: 0, rating: 5, reviews: 18,
    images: [
      "https://images.unsplash.com/photo-1519947486511-46149fa0a254?q=80&w=900&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1600607687644-c7171b42498f?q=80&w=900&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1615529182904-14819c35db37?q=80&w=900&auto=format&fit=crop"
    ],
    video: "",
    colors: [ {name:"Nogueira", hex:"#6b4423"}, {name:"Branco", hex:"#f2f0ea"} ],
    description: "Rack suspenso de 180cm com nicho para TVs de até 65\". Design minimalista com painel ripado e suporte oculto para organização de cabos. Fixação em parede com kit de instalação incluso."
  },
  {
    id: "d7", tag: "launch", category: "quarto",
    name: "Cama Box Casal Queen Premium",
    price: 2499.90, oldPrice: 0, rating: 4.5, reviews: 22,
    images: [
      "https://images.unsplash.com/photo-1600121848594-d8644e57abab?q=80&w=900&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1560185893-a55cbc8c57e8?q=80&w=900&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?q=80&w=900&auto=format&fit=crop"
    ],
    video: "",
    colors: [ {name:"Cinza", hex:"#8a8a8a"}, {name:"Bege", hex:"#d8c9a8"} ],
    description: "Cama box queen size com colchão de molas ensacadas independentes, camada de espumas de conforto e acabamento em tecido suede. Base estruturada em madeira reforçada para maior durabilidade."
  },
  {
    id: "d8", tag: "launch", category: "escritorio",
    name: "Cadeira de Escritório Ergonômica",
    price: 649.90, oldPrice: 0, rating: 4.5, reviews: 31,
    images: [
      "https://images.unsplash.com/photo-1567016432779-094069958ea5?q=80&w=900&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1580480055273-228ff5388ef8?q=80&w=900&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1541558869434-2840d308329a?q=80&w=900&auto=format&fit=crop"
    ],
    video: "",
    colors: [ {name:"Preto", hex:"#1c1c1c"} ],
    description: "Cadeira ergonômica com apoio lombar ajustável, encosto em tela respirável e braços reguláveis em altura. Base giratória com rodízios silenciosos, indicada para longas jornadas de trabalho."
  },
  {
    id: "d9", tag: "launch", category: "decoracao",
    name: "Espelho Decorativo Redondo Dourado",
    price: 259.90, oldPrice: 0, rating: 5, reviews: 12,
    images: [
      "https://images.unsplash.com/photo-1631679706909-1844bbd07221?q=80&w=900&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1618220179428-22790b461013?q=80&w=900&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1616627561837-71fac9fd0234?q=80&w=900&auto=format&fit=crop"
    ],
    video: "",
    colors: [ {name:"Dourado", hex:"#c9a53a"} ],
    description: "Espelho decorativo redondo com moldura em metal dourado escovado, 80cm de diâmetro. Peça de destaque para salas, corredores e quartos, com sistema de fixação reforçado."
  },
  {
    id: "d10", tag: "launch", category: "decoracao",
    name: "Luminária de Chão Articulada",
    price: 329.90, oldPrice: 0, rating: 4.5, reviews: 9,
    images: [
      "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?q=80&w=900&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1517991104123-1d56a6e81ed9?q=80&w=900&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1540932239986-30128078f3c5?q=80&w=900&auto=format&fit=crop"
    ],
    video: "",
    colors: [ {name:"Preto", hex:"#1c1c1c"}, {name:"Dourado", hex:"#c9a53a"} ],
    description: "Luminária de chão com haste articulada e cúpula direcionável, ideal para leitura ou iluminação de destaque. Base em metal com peso balanceado e fiação têxtil revestida."
  },
  {
    id: "d11", tag: "deal", category: "sala",
    name: "Cadeira Eames Base Madeira",
    price: 199.90, oldPrice: 249.90, rating: 4.5, reviews: 80,
    images: [
      "https://images.unsplash.com/photo-1503602642458-232111445657?q=80&w=900&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1503602642458-232111445657?q=80&w=900&auto=format&fit=crop&flip=h",
      "https://images.unsplash.com/photo-1592078615290-033ee584e267?q=80&w=900&auto=format&fit=crop"
    ],
    video: "",
    colors: [ {name:"Branco", hex:"#f2f0ea"}, {name:"Preto", hex:"#1c1c1c"}, {name:"Verde", hex:"#4a5d43"} ],
    description: "Cadeira estilo Eames com casca em polipropileno e base em madeira maciça tipo Eiffel. Design atemporal, leve e resistente, perfeita para mesas de jantar ou home office."
  },
  {
    id: "d12", tag: "deal", category: "cozinha",
    name: "Liquidificador Turbo 900W",
    price: 169.90, oldPrice: 199.90, rating: 4.5, reviews: 64,
    images: [
      "https://images.unsplash.com/photo-1585515320310-259814833e62?q=80&w=900&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1570222094114-d054a817e56b?q=80&w=900&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1570475496411-0f2f76b30ded?q=80&w=900&auto=format&fit=crop"
    ],
    video: "",
    colors: [ {name:"Preto", hex:"#1c1c1c"}, {name:"Branco", hex:"#f2f0ea"} ],
    description: "Liquidificador com motor turbo de 900W, jarra em vidro temperado de 2L e 12 velocidades de rotação, incluindo função pulsar. Lâminas em inox de 4 pontas para trituração eficiente."
  },
  {
    id: "d13", tag: "deal", category: "cozinha",
    name: "Cafeteira Elétrica Inox 30 Cafés",
    price: 119.90, oldPrice: 159.90, rating: 4.5, reviews: 42,
    images: [
      "https://images.unsplash.com/photo-1516224498413-84ecf3a1e7fc?q=80&w=900&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?q=80&w=900&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1498804103079-a6351b050096?q=80&w=900&auto=format&fit=crop"
    ],
    video: "",
    colors: [ {name:"Inox", hex:"#b8bcbf"} ],
    description: "Cafeteira elétrica com corpo em inox, capacidade para 30 cafezinhos e sistema corta-pingos. Placa aquecedora que mantém o café quente por mais tempo, com filtro permanente incluso."
  },
  {
    id: "d14", tag: "deal", category: "cozinha",
    name: "Jogo de Panelas Antiaderente 5 Peças",
    price: 209.90, oldPrice: 299.90, rating: 4.5, reviews: 37,
    images: [
      "https://images.unsplash.com/photo-1584990347449-a75d0e0d1b58?q=80&w=900&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1584990347153-1e29ecc8d4d8?q=80&w=900&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1590794056450-1a5b1c992e5d?q=80&w=900&auto=format&fit=crop"
    ],
    video: "",
    colors: [ {name:"Preto", hex:"#1c1c1c"}, {name:"Vermelho", hex:"#8a2c22"} ],
    description: "Conjunto com 5 panelas em alumínio forjado e revestimento antiaderente triplo, cabos ergonômicos com isolamento térmico. Compatível com todos os tipos de fogão."
  },
  {
    id: "d15", tag: "deal", category: "escritorio",
    name: "Estante Livreira 5 Prateleiras",
    price: 179.90, oldPrice: 199.90, rating: 4.5, reviews: 22,
    images: [
      "https://images.unsplash.com/photo-1594620302200-9a762244a156?q=80&w=900&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?q=80&w=900&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1526406915894-7bcd65f60845?q=80&w=900&auto=format&fit=crop"
    ],
    video: "",
    colors: [ {name:"Nogueira", hex:"#6b4423"}, {name:"Branco", hex:"#f2f0ea"} ],
    description: "Estante livreira com 5 prateleiras em MDF de alta resistência, estrutura reforçada para suportar até 15kg por prateleira. Ideal para livros, decoração e objetos pessoais."
  }
];

/* ---------------- Helpers básicos ---------------- */
function loadLS(key, fallback){
  try{ const v = JSON.parse(localStorage.getItem(key)); return v===null||v===undefined ? fallback : v; }
  catch(e){ return fallback; }
}

function formatBR(n){
  return Number(n||0).toLocaleString('pt-BR', {minimumFractionDigits:2, maximumFractionDigits:2});
}

function starString(rating){
  const full = Math.floor(rating);
  const half = rating % 1 !== 0;
  return "★".repeat(full) + (half ? "✬" : "") + "☆".repeat(Math.max(0, 5-full-(half?1:0)));
}

function categoryLabel(cat){
  const map = {
    sala:"Sala de Estar", quarto:"Quarto", cozinha:"Cozinha", banheiro:"Banheiro",
    escritorio:"Escritório", decoracao:"Decoração", utilidades:"Utilidades", organizacao:"Organização"
  };
  return map[cat] || cat;
}

/* Garante que todo produto tenha uma "tag" (bestseller/launch/deal) usada
   para preencher as abas de Destaques, mesmo quando o produto vem da API
   ou do painel local (que não guardam essa classificação). */
function classifyProducts(list){
  return list.map((p, i) => {
    if(p.tag) return p;
    const hasDeal = p.oldPrice && p.oldPrice > p.price;
    return { ...p, tag: hasDeal ? "deal" : (i % 2 === 0 ? "bestseller" : "launch") };
  });
}

function loadLocalAdminProducts(){
  return loadLS('wm_products', []).filter(p => p.showOnSite);
}
function localAdminToUnified(p){
  const gallery = (p.gallery && p.gallery.length) ? p.gallery : [p.image || FALLBACK_IMG];
  return {
    id: String(p.id), category: p.category || "utilidades", name: p.name,
    price: p.price || 0, oldPrice: p.oldPrice || 0, rating: 5, reviews: 0,
    images: gallery, video: p.video || "", colors: p.colors || [],
    description: p.description || "Produto de qualidade da WM Móveis & Utilidades, pronto para transformar seu ambiente com estilo e praticidade."
  };
}

/* ----------------------------------------------------------------------
   Fontes de dados, em ordem de prioridade:
   1) Backend (API), se uma URL tiver sido configurada em Configurações
   2) Produtos cadastrados localmente no Painel (localStorage), modo offline
   3) Catálogo de demonstração (demoProducts), para quando nada foi configurado
   ---------------------------------------------------------------------- */

async function getAllProducts(){
  if(typeof getApiBaseUrl === 'function' && getApiBaseUrl()){
    try{
      const products = await apiGetProducts();
      if(products && products.length) return classifyProducts(products);
    }catch(err){
      console.warn('Não foi possível carregar produtos da API, usando dados locais:', err.message);
    }
  }
  const local = loadLocalAdminProducts();
  if(local.length) return classifyProducts(local.map(localAdminToUnified));
  return classifyProducts(demoProducts);
}

async function getProductById(id){
  if(typeof getApiBaseUrl === 'function' && getApiBaseUrl()){
    try{
      const product = await apiGetProduct(id);
      if(product) return product;
    }catch(err){
      console.warn('Não foi possível carregar produto da API, buscando localmente:', err.message);
    }
  }
  const all = await getAllProducts();
  return all.find(p => String(p.id) === String(id));
}

async function getRelatedProducts(product, limit){
  limit = limit || 6;
  if(typeof getApiBaseUrl === 'function' && getApiBaseUrl()){
    try{
      const related = await apiGetRelated(product.id);
      if(related) return related.slice(0, limit);
    }catch(err){
      console.warn('Não foi possível carregar relacionados da API, calculando localmente:', err.message);
    }
  }
  const all = (await getAllProducts()).filter(p => String(p.id) !== String(product.id));
  const sameCategory = all.filter(p => p.category === product.category);
  const rest = all.filter(p => p.category !== product.category);
  return [...sameCategory, ...rest].slice(0, limit);
}

/* Banner principal (hero): mesma lógica de prioridade (API > localStorage). */
async function getHeroBanner(){
  if(typeof getApiBaseUrl === 'function' && getApiBaseUrl()){
    try{
      const banner = await apiGetBanner();
      if(banner && (banner.image_url || banner.title)) {
        return { image: banner.image_url, title: banner.title, subtitle: banner.subtitle };
      }
    }catch(err){
      console.warn('Não foi possível carregar banner da API, usando local:', err.message);
    }
  }
  return loadLS('wm_hero_banner', null);
}
