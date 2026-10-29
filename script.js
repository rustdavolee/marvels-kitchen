/* Business details and menu content are kept here for quick, safe editing. */
const BUSINESS = {
  name: "Marvel’s Kitchen",
  email: "Marvelousufelix@gmail.com",
  phoneDisplay: "08119000048",
  // WhatsApp format: Nigeria country code +234, without the leading zero.
  whatsapp: "2348157727770",
  address: "Address to be supplied — update this placeholder"
};

const MENU_ITEMS = [
  { name: "Jollof Rice", description: "A much-loved West African rice dish with rich tomato and pepper flavours.", price: 4500, category: "Rice Dishes", image: "https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=900&q=80", alt: "A colourful plate of rice and vegetables" },
  { name: "Fried Rice", description: "Colourful rice with vegetables and a satisfying mix of savoury flavours.", price: 5000, category: "Rice Dishes", image: "https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=900&q=80", alt: "A bowl of rice with fresh vegetables" },
  { name: "Ofada Rice", description: "A beloved local rice favourite, served with a rich pepper sauce.", price: 5500, category: "Rice Dishes", image: "https://images.unsplash.com/photo-1516684732162-798a0062be99?auto=format&fit=crop&w=900&q=80", alt: "A serving of rice ready to enjoy" },
  { name: "Egusi Soup", description: "A hearty melon-seed soup inspired by traditional Nigerian cooking.", price: 4000, category: "Soups and Swallows", image: "https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=900&q=80", alt: "A comforting bowl of soup and accompaniments" },
  { name: "Okra Soup", description: "A comforting, flavourful soup to enjoy with your choice of swallow.", price: 3800, category: "Soups and Swallows", image: "https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=900&q=80", alt: "A freshly prepared traditional-style soup" },
  { name: "Pounded Yam", description: "A soft, satisfying swallow pairing for your favourite soup.", price: 1800, category: "Soups and Swallows", image: "https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=900&q=80", alt: "A meal served with a traditional swallow" },
  { name: "Grilled Chicken", description: "A savoury protein option with a deliciously seasoned finish.", price: 3500, category: "Proteins and Sides", image: "https://images.unsplash.com/photo-1532550907401-a500c9a57435?auto=format&fit=crop&w=900&q=80", alt: "Seasoned grilled chicken served with fresh sides" },
  { name: "Moi Moi", description: "A tender steamed bean pudding and a versatile meal-time favourite.", price: 1500, category: "Proteins and Sides", image: "https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=900&q=80", alt: "A freshly prepared savoury side dish" },
  { name: "Meat Pie", description: "A golden, savoury pastry idea for a quick bite or a light snack.", price: 1200, category: "Snacks", image: "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=900&q=80", alt: "Freshly baked golden pastries" },
  { name: "Puff-Puff", description: "A soft, golden snack made for sharing and enjoying together.", price: 1000, category: "Snacks", image: "https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=900&q=80", alt: "A selection of freshly baked golden treats" },
  { name: "Fresh Zobo", description: "A refreshing hibiscus drink, perfect alongside a lovely meal.", price: 1000, category: "Drinks", image: "https://images.unsplash.com/photo-1513558161293-cdaf765edfd7?auto=format&fit=crop&w=900&q=80", alt: "A refreshing red drink served with fruit" },
  { name: "Fruit Juice", description: "A bright, fruity drink to round out your meal.", price: 1500, category: "Drinks", image: "https://images.unsplash.com/photo-1600271886742-f049cd451bba?auto=format&fit=crop&w=900&q=80", alt: "A glass of colourful fruit juice" }
];

const FALLBACK_IMAGE = "assets/food-placeholder.svg";

function formatNaira(amount) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0
  }).format(amount);
}

function whatsappUrl(message) {
  return `https://wa.me/${BUSINESS.whatsapp}?text=${encodeURIComponent(message)}`;
}

function setBusinessDetails() {
  document.querySelectorAll("[data-whatsapp-link]").forEach((link) => {
    link.href = whatsappUrl(`Hello ${BUSINESS.name}! I would like to make an enquiry.`);
  });
  document.querySelectorAll("[data-address]").forEach((element) => {
    element.textContent = BUSINESS.address;
  });
  document.title = `${BUSINESS.name} | Cooked with Love, Inspired by Tradition`;
  document.getElementById("current-year").textContent = String(new Date().getFullYear());
}

function createMenuCard(item) {
  const article = document.createElement("article");
  article.className = "dish-card";

  const photoWrap = document.createElement("div");
  photoWrap.className = "dish-photo-wrap";
  const image = document.createElement("img");
  image.className = "dish-photo";
  image.src = item.image;
  image.alt = item.alt;
  image.loading = "lazy";
  image.addEventListener("error", () => {
    image.src = FALLBACK_IMAGE;
  }, { once: true });
  const category = document.createElement("span");
  category.className = "dish-category";
  category.textContent = item.category;
  photoWrap.append(image, category);

  const content = document.createElement("div");
  content.className = "dish-content";
  const title = document.createElement("h3");
  title.textContent = item.name;
  const description = document.createElement("p");
  description.textContent = item.description;

  const footer = document.createElement("div");
  footer.className = "dish-footer";
  const price = document.createElement("span");
  price.className = "dish-price";
  price.textContent = formatNaira(item.price);
  const order = document.createElement("button");
  order.className = "order-meal";
  order.type = "button";
  order.textContent = "Order This Meal";
  order.addEventListener("click", () => {
    const message = `Hello ${BUSINESS.name}! I would like to order ${item.name}. The listed price is ${formatNaira(item.price)}. Please confirm availability and delivery or pickup options.`;
    window.open(whatsappUrl(message), "_blank", "noopener,noreferrer");
  });
  footer.append(price, order);
  content.append(title, description, footer);
  article.append(photoWrap, content);
  return article;
}

function renderMenu(category = "All") {
  const grid = document.getElementById("menu-grid");
  const items = category === "All"
    ? MENU_ITEMS
    : MENU_ITEMS.filter((item) => item.category === category);
  grid.replaceChildren(...items.map(createMenuCard));

  document.querySelectorAll(".filter-button").forEach((button) => {
    const isActive = button.dataset.filter === category;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
}

function setupMenuFilters() {
  document.querySelectorAll(".filter-button").forEach((button) => {
    button.addEventListener("click", () => renderMenu(button.dataset.filter));
  });
  renderMenu();
}

function setupMobileNavigation() {
  const toggle = document.querySelector(".menu-toggle");
  const navigation = document.getElementById("site-navigation");

  function closeMenu() {
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-label", "Open navigation menu");
    navigation.classList.remove("is-open");
    document.body.classList.remove("menu-open");
  }

  toggle.addEventListener("click", () => {
    const isOpen = toggle.getAttribute("aria-expanded") === "true";
    toggle.setAttribute("aria-expanded", String(!isOpen));
    toggle.setAttribute("aria-label", isOpen ? "Open navigation menu" : "Close navigation menu");
    navigation.classList.toggle("is-open", !isOpen);
    document.body.classList.toggle("menu-open", !isOpen);
  });

  navigation.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener("click", closeMenu);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && toggle.getAttribute("aria-expanded") === "true") {
      closeMenu();
      toggle.focus();
    }
  });
}

function setupContactForm() {
  const form = document.getElementById("contact-form");
  const status = document.getElementById("form-status");

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const name = String(formData.get("name")).trim();
    const phone = String(formData.get("phone")).trim();
    const enquiryType = String(formData.get("type"));
    const message = String(formData.get("message")).trim();
    const text = [
      `Hello ${BUSINESS.name}!`,
      `My name is ${name}.`,
      phone ? `My phone number is ${phone}.` : "",
      `Enquiry: ${enquiryType}.`,
      `Message: ${message}`
    ].filter(Boolean).join("\n");
    const link = document.createElement("a");
    link.href = whatsappUrl(text);
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = "open your message in WhatsApp";

    window.open(link.href, "_blank", "noopener,noreferrer");
    status.replaceChildren(
      document.createTextNode("Your message is ready to review in WhatsApp. If it did not open, "),
      link
    );
  });
}

function setupImageFallbacks() {
  document.querySelectorAll("img").forEach((image) => {
    image.addEventListener("error", () => {
      if (image.getAttribute("src") !== FALLBACK_IMAGE) {
        image.src = FALLBACK_IMAGE;
      }
    }, { once: true });
  });
}

setBusinessDetails();
setupMenuFilters();
setupMobileNavigation();
setupContactForm();
setupImageFallbacks();
