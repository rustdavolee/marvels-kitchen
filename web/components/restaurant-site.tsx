"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  api,
  ApiError,
  formatNaira,
  type MenuItem,
  type OrderResponse,
} from "@/lib/api";
import { business, categories, type MenuCategory } from "@/lib/business";
import { previewMenu } from "@/lib/preview-menu";

type Cart = Record<string, number>;
type Fulfillment = "" | "Pickup" | "Delivery";

const photos = [
  {
    src: "/assets/menu/jollof.jpg",
    alt: "Colourful, freshly prepared meal with vegetables",
    caption: "Colourful comforts",
  },
  {
    src: "/assets/menu/moi-moi.jpg",
    alt: "Fresh salad with a variety of ingredients",
    caption: "Fresh from the kitchen",
  },
  {
    src: "/assets/menu/gallery-bowl.jpg",
    alt: "A nourishing bowl of food topped with fresh ingredients",
    caption: "Made to be savoured",
  },
  {
    src: "/assets/menu/gallery-table.jpg",
    alt: "A table filled with fresh ingredients and dishes",
    caption: "Goodness in every bite",
  },
  {
    src: "/assets/menu/grilled-chicken.jpg",
    alt: "A colourful home-style meal ready to enjoy",
    caption: "Gather around",
  },
];

const values = [
  {
    icon: "♡",
    title: "Prepared with Care",
    copy: "Thoughtful preparation is at the centre of everything we make.",
  },
  {
    icon: "✳",
    title: "Inspired by Tradition",
    copy: "Familiar food traditions inspire the flavours we love to share.",
  },
  {
    icon: "☼",
    title: "A Welcoming Experience",
    copy: "We want every conversation and meal to feel warm and welcoming.",
  },
  {
    icon: "↗",
    title: "Convenient Ordering",
    copy: "Build your basket on our website and send your order details for confirmation.",
  },
];

function isSoup(item: MenuItem) {
  return item.includes_complimentary_swallow;
}

function ItemPhoto({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className: string;
}) {
  const [failed, setFailed] = useState(false);
  return (
    <Image
      src={failed ? "/assets/food-placeholder.svg" : src}
      alt={alt}
      width={900}
      height={650}
      unoptimized
      loading="lazy"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}

export function RestaurantSite() {
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [whatsappNumber, setWhatsappNumber] = useState<string>(business.whatsapp);
  const [menuError, setMenuError] = useState("");
  const [loadingMenu, setLoadingMenu] = useState(true);
  const [heroImageFailed, setHeroImageFailed] = useState(false);
  const [category, setCategory] = useState<MenuCategory>("All");
  const [cart, setCart] = useState<Cart>({});
  const [cartOpen, setCartOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [fulfillment, setFulfillment] = useState<Fulfillment>("");
  const [orderError, setOrderError] = useState("");
  const [savingOrder, setSavingOrder] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<OrderResponse | null>(
    null,
  );
  const [reviewMessage, setReviewMessage] = useState("");
  const [reviewError, setReviewError] = useState("");
  const [reviewSent, setReviewSent] = useState(false);

  const loadMenu = useCallback(async () => {
    try {
      const result = await api.getMenu();
      setMenu(result.items);
      setWhatsappNumber(result.business.whatsapp);
    } catch (error) {
      setMenuError(
        error instanceof ApiError
          ? error.message
          : "The menu could not be loaded. Please try again.",
      );
    } finally {
      setLoadingMenu(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadMenu();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadMenu]);

  useEffect(() => {
    if (!cartOpen && !mobileMenuOpen) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setCartOpen(false);
        setMobileMenuOpen(false);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [cartOpen, mobileMenuOpen]);

  const filteredMenu = useMemo(() => {
    const availableMenu = menuError ? previewMenu : menu;
    return (
      category === "All"
        ? availableMenu
        : availableMenu.filter((item) => item.category === category)
    );
  }, [category, menu, menuError]);

  const cartItems = useMemo(() => {
    const availableMenu = menuError ? previewMenu : menu;
    return (
      Object.entries(cart)
        .map(([id, quantity]) => {
          const item = availableMenu.find((entry) => entry.id === id);
          return item ? { item, quantity } : null;
        })
        .filter((entry): entry is { item: MenuItem; quantity: number } =>
          Boolean(entry),
        )
    );
  }, [cart, menu, menuError]);
  const itemCount = cartItems.reduce((sum, entry) => sum + entry.quantity, 0);
  const subtotal = cartItems.reduce(
    (sum, entry) => sum + entry.item.amount_ngn * entry.quantity,
    0,
  );
  const containsSoup = cartItems.some(({ item }) => isSoup(item));

  function addToCart(item: MenuItem) {
    setCompletedOrder(null);
    setCart((current) => ({
      ...current,
      [item.id]: (current[item.id] ?? 0) + 1,
    }));
  }

  function changeQuantity(itemId: string, delta: number) {
    setCart((current) => {
      const next = { ...current };
      const quantity = (next[itemId] ?? 0) + delta;
      if (quantity <= 0) delete next[itemId];
      else next[itemId] = quantity;
      return next;
    });
  }

  function resetCheckout() {
    setCart({});
    setFulfillment("");
    setOrderError("");
    setSavingOrder(false);
  }

  async function submitOrder(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setOrderError("");
    setCompletedOrder(null);
    const formData = new FormData(event.currentTarget);
    const preferredSwallow = String(formData.get("preferredSwallow") ?? "").trim();
    const deliveryAddress = String(formData.get("deliveryAddress") ?? "").trim();

    if (containsSoup && !preferredSwallow) {
      setOrderError("Please tell us your complimentary swallow choice.");
      return;
    }
    if (fulfillment === "Delivery" && !deliveryAddress) {
      setOrderError("Please enter your delivery address.");
      return;
    }
    if (!fulfillment) {
      setOrderError("Please choose pickup or delivery.");
      return;
    }

    setSavingOrder(true);
    const customer = {
      name: String(formData.get("name") ?? "").trim(),
      phone: String(formData.get("phone") ?? "").trim(),
      email: String(formData.get("email") ?? "").trim() || undefined,
    };
    const notes = String(formData.get("notes") ?? "").trim();
    try {
      const result = await api.createOrder({
        customer,
        fulfillment,
        delivery_address: deliveryAddress || undefined,
        preferred_swallow: preferredSwallow || undefined,
        notes: notes || undefined,
        items: cartItems.map(({ item, quantity }) => ({
          item_id: item.id,
          quantity,
        })),
      });
      setCompletedOrder(result);
      resetCheckout();
    } catch (error) {
      if (menuError && error instanceof ApiError && error.status === undefined) {
        const orderId = "PREVIEW ONLY";
        const orderLines = cartItems.map(
          ({ item, quantity }) =>
            `${item.name} × ${quantity} — ${formatNaira(item.amount_ngn * quantity)}`,
        );
        const message = [
          `Hello ${business.name}! This is a TEST order from the local website preview.`,
          "This is not a real order. The menu and prices are samples; please do not prepare, charge, or fulfil it.",
          "",
          `Preview reference: ${orderId}`,
          ...orderLines,
          containsSoup
            ? `Complimentary swallow choice: ${preferredSwallow}`
            : "",
          `Food subtotal (sample): ${formatNaira(subtotal)}`,
          `Customer: ${customer.name}`,
          `Phone: ${customer.phone}`,
          customer.email ? `Email: ${customer.email}` : "",
          `Fulfilment: ${fulfillment}`,
          fulfillment === "Delivery" ? `Delivery address: ${deliveryAddress}` : "",
          notes ? `Order notes: ${notes}` : "",
          "",
          "Website preview test only — no order has been placed or saved.",
        ]
          .filter(Boolean)
          .join("\n");
        const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
        setCompletedOrder({
          order_id: orderId,
          status: "preview",
          subtotal_ngn: subtotal,
          delivery_fee_ngn: null,
          total_ngn: null,
          whatsapp_url: whatsappUrl,
        });
        resetCheckout();
      } else {
        setOrderError(
          error instanceof ApiError
            ? error.message
            : "We could not save this order. Please check your connection and try again.",
        );
      }
    } finally {
      setSavingOrder(false);
    }
  }

  function submitReview(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setReviewError("");
    const data = new FormData(event.currentTarget);
    const name = String(data.get("name") ?? "").trim();
    const rating = String(data.get("rating") ?? "");
    const message = String(data.get("message") ?? "").trim();
    if (!name || !rating || !message) {
      setReviewError("Please complete each field before continuing.");
      return;
    }
    window.location.href = api.createReviewEmail(name, rating, message);
    setReviewSent(true);
    setReviewMessage("Your review is ready in your email app.");
  }

  function closeMobileNavigation() {
    setMobileMenuOpen(false);
  }

  return (
    <>
      <a
        href="#main"
        className="fixed left-3 top-3 z-[100] -translate-y-24 rounded bg-white px-4 py-2 text-deep focus:translate-y-0"
      >
        Skip to content
      </a>
      <header className="site-header sticky top-0 z-40 border-b border-forest/10 bg-cream/95 backdrop-blur-md">
        <div className="container flex min-h-24 items-center justify-between gap-4">
          <a
            href="#home"
            className="flex size-[75px] shrink-0 items-center justify-center"
            aria-label={`${business.name} home`}
          >
            <Image
              src="/assets/marvels-kitchen-logo.png"
              alt={`${business.name} logo`}
              width={75}
              height={75}
              priority
              className="size-[75px] object-contain"
            />
          </a>
          <button
            type="button"
            className="grid size-11 shrink-0 place-content-center gap-1.5 rounded-[5px] border border-forest bg-forest min-[861px]:hidden"
            aria-label={mobileMenuOpen ? "Close navigation" : "Open navigation"}
            aria-expanded={mobileMenuOpen}
            aria-controls="primary-navigation"
            onClick={() => setMobileMenuOpen((open) => !open)}
          >
            <span className="h-0.5 w-5 bg-white" />
            <span className="h-0.5 w-5 bg-white" />
            <span className="h-0.5 w-5 bg-white" />
          </button>
          <nav
            id="primary-navigation"
            aria-label="Main navigation"
            className={`${mobileMenuOpen ? "visible translate-y-0 opacity-100" : "invisible -translate-y-2 opacity-0 min-[861px]:visible min-[861px]:translate-y-0 min-[861px]:opacity-100"} fixed inset-x-0 top-24 z-40 flex max-h-[calc(100dvh-6rem)] flex-col gap-1 overflow-y-auto rounded-b-[5px] bg-deep px-4 pb-6 pt-3 shadow-xl transition min-[861px]:static min-[861px]:max-h-none min-[861px]:flex-row min-[861px]:items-center min-[861px]:gap-1 min-[861px]:overflow-visible min-[861px]:rounded-[5px] min-[861px]:bg-forest min-[861px]:px-2 min-[861px]:py-2 min-[861px]:shadow-md`}
          >
            {[
              ["Home", "#home"],
              ["About", "#about"],
              ["Menu", "#menu"],
              ["Gallery", "#gallery"],
              ["Contact", "#contact"],
            ].map(([label, href]) => (
              <a
                key={href}
                href={href}
                onClick={closeMobileNavigation}
                className="rounded-[5px] border-b border-white/10 px-3 py-3 text-sm font-semibold text-white transition hover:bg-white/10 hover:text-[#e4c765] min-[861px]:border-0 min-[861px]:px-3 min-[861px]:py-2"
              >
                {label}
              </a>
            ))}
            <a
              href="#menu"
              onClick={closeMobileNavigation}
              className="button button-gold mt-3 rounded-[5px] min-[861px]:ml-1 min-[861px]:mt-0"
            >
              Order on Site <span aria-hidden="true">↗</span>
            </a>
          </nav>
        </div>
      </header>

      <main id="main">
        <section
          id="home"
          className="relative isolate flex min-h-[620px] items-center overflow-hidden bg-deep text-white sm:min-h-[690px] lg:min-h-[min(760px,calc(100svh-96px))]"
        >
          <Image
            src={
              heroImageFailed
                ? "/assets/food-placeholder.svg"
                : "/assets/menu/jollof.jpg"
            }
            alt=""
            fill
            priority
            unoptimized
            sizes="100vw"
            onError={() => setHeroImageFailed(true)}
            className="z-[-2] object-cover object-[59%_center] sm:object-center"
          />
          <div className="absolute inset-0 z-[-1] bg-gradient-to-r from-deep/95 via-deep/75 to-deep/25 sm:from-deep/90 sm:via-deep/65 sm:to-deep/10" />
          <div className="container py-24 sm:py-28">
            <h1 className="max-w-[800px] font-display text-[clamp(3.2rem,10vw,6.8rem)] font-medium leading-[.99] tracking-[-.055em]">
              Good Food.
              <br />
              Great Moments.
              <br />
              <em className="text-[#e4c765]">Made with Love.</em>
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-white/85 sm:text-lg">
              Discover delicious meals inspired by tradition, prepared with
              care, and served with the love you deserve.
            </p>
            <div className="mt-8 flex max-w-md flex-col gap-3 min-[460px]:flex-row">
              <a className="button button-outline flex-1" href="#menu">
                Explore Our Menu <span aria-hidden="true">↓</span>
              </a>
              <a className="button button-gold flex-1" href="#menu">
                Start an Order <span aria-hidden="true">↓</span>
              </a>
            </div>
            <p className="mt-7 font-display text-sm italic text-white/75 sm:text-base">
              {business.tagline}
            </p>
          </div>
          <a
            className="absolute bottom-5 right-5 hidden items-center gap-3 text-xs uppercase tracking-widest text-white/75 sm:flex sm:bottom-8 sm:right-8"
            href="#about"
          >
            <span className="h-px w-8 bg-gold" />
            Discover our kitchen
          </a>
        </section>

        <div className="bg-cream">
          <div className="container flex min-h-[68px] items-center justify-center gap-4 py-3 text-center text-forest sm:gap-7">
            <span className="text-gold" aria-hidden="true">✳</span>
            <p className="font-display text-sm italic sm:text-base">
              Warm flavours. Thoughtful cooking. A little more joy at your table.
            </p>
            <span className="text-gold" aria-hidden="true">✳</span>
          </div>
        </div>

        <section id="about" className="section-space bg-white">
          <div className="container grid items-center gap-12 md:grid-cols-2 md:gap-16 lg:gap-24">
            <div className="relative mx-3 mb-4 min-h-[330px] sm:min-h-[440px] md:mb-0">
              <div className="absolute -left-3 -top-3 h-full w-full border border-gold sm:-left-5 sm:-top-5" />
              <ItemPhoto
                src="/assets/menu/jollof.jpg"
                alt="A colourful spread of freshly prepared food"
                className="relative z-10 h-[330px] w-full object-cover sm:h-[440px]"
              />
              <div className="absolute -bottom-4 right-[-12px] z-20 flex items-center gap-3 bg-cream px-4 py-3 font-display text-sm italic text-forest shadow-lg sm:right-[-22px] sm:px-5">
                <span className="text-gold" aria-hidden="true">✳</span>
                Good food is a love language.
              </div>
            </div>
            <div className="max-w-xl">
              <h2 className="section-title">Our Story<span className="text-gold">.</span></h2>
              <p className="body-copy mt-5">
                At Marvel’s Kitchen, food is more than a meal — it is an
                expression of care, culture, and connection. Inspired by
                tradition and prepared with love, we aim to make every meal a
                memorable experience.
              </p>
              <a href="#contact" className="button button-green mt-7">
                Come say hello <span aria-hidden="true">→</span>
              </a>
              <p className="mt-8 flex items-center gap-3 font-display text-sm italic text-muted">
                <span className="h-px w-9 bg-gold" />
                Made with care, from our kitchen to your table
              </p>
            </div>
          </div>
        </section>

        <section id="menu" className="section-space bg-cream">
          <div className="container">
            <div className="grid items-end gap-5 lg:grid-cols-[1fr_360px] lg:gap-10">
              <div>
                <p className="eyebrow">Something delicious awaits</p>
                <h2 className="section-title">
                  A menu made for <em>sharing.</em>
                </h2>
              </div>
              <p className="body-copy text-sm">
                Choose your favourites, add them to your basket, and enter your
                order details here. We’ll send your completed order for
                confirmation.
              </p>
            </div>

            <div
              className="mt-8 flex gap-2 overflow-x-auto pb-2 sm:flex-wrap sm:overflow-visible"
              role="group"
              aria-label="Filter menu by category"
            >
              {categories.map((entry) => (
                <button
                  type="button"
                  key={entry}
                  aria-pressed={category === entry}
                  onClick={() => setCategory(entry)}
                  className={`min-h-11 shrink-0 rounded-[5px] border px-4 text-xs font-semibold transition focus-visible:outline-offset-2 sm:text-sm ${category === entry ? "border-forest bg-forest text-white shadow-sm" : "border-forest/20 bg-white text-forest hover:border-forest hover:bg-forest/5"}`}
                >
                  {entry}
                </button>
              ))}
            </div>

            <div className="my-4 flex flex-col gap-4 border-l-[3px] border-gold bg-white/80 p-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="flex gap-3 text-sm leading-6 text-muted">
                <span className="shrink-0 text-lg text-gold" aria-hidden="true">✳</span>
                <span>
                  <strong className="text-forest">
                    All soups come with one complimentary swallow of your choice.
                  </strong>{" "}
                  Choose it when you check out.
                </span>
              </p>
              <button
                type="button"
                onClick={() => setCartOpen(true)}
                className="button button-green w-full shrink-0 sm:w-auto"
              >
                View order <span aria-hidden="true">→</span>
              </button>
            </div>

            {loadingMenu && (
              <div className="rounded border border-forest/10 bg-white p-8 text-center text-muted" role="status">
                Loading today’s menu…
              </div>
            )}
            {menuError && (
              <div className="rounded border border-gold/40 bg-white p-5 text-sm text-ink" role="status">
                <p className="font-semibold text-forest">Sample menu preview</p>
                <p className="mt-1 text-muted">
                  The live order service is unavailable, so these sample dishes
                  and prices are for preview only. You can try the checkout,
                  but preview orders are not saved and must not be treated as
                  real orders.
                </p>
                <button
                  type="button"
                  className="mt-3 font-bold text-forest underline"
                  onClick={() => {
                    setLoadingMenu(true);
                    setMenuError("");
                    void loadMenu();
                  }}
                >
                  Try again
                </button>
              </div>
            )}
            {!loadingMenu && filteredMenu.length === 0 && (
              <p className="rounded bg-white p-8 text-center text-muted">
                There are no dishes in this category at the moment.
              </p>
            )}
            {!loadingMenu && filteredMenu.length > 0 && (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {filteredMenu.map((item) => (
                  <article
                    key={item.id}
                    className="group overflow-hidden bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
                  >
                    <div className="relative h-52 overflow-hidden bg-[#e9e1d2] sm:h-56">
                      <ItemPhoto
                        src={item.image_url}
                        alt={item.image_alt}
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                      />
                      <span className="absolute left-3 top-3 bg-cream px-3 py-1 text-[.68rem] font-bold text-forest">
                        {item.category}
                      </span>
                    </div>
                    <div className="p-5">
                      <h3 className="font-display text-xl font-semibold text-forest">{item.name}</h3>
                      <p className="mt-2 min-h-[3.1rem] text-sm leading-6 text-muted">{item.description}</p>
                      {isSoup(item) && (
                        <p className="mt-2 text-xs font-semibold text-forest">
                          Includes a complimentary swallow of your choice
                        </p>
                      )}
                      <div className="mt-5 flex items-center justify-between gap-3 border-t border-forest/10 pt-4">
                        <strong className="text-forest">{formatNaira(item.amount_ngn)}</strong>
                        <button
                          type="button"
                          className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-[5px] border border-forest bg-forest px-2.5 text-xs font-bold text-white shadow-sm transition hover:border-gold hover:bg-gold hover:text-deep focus-visible:outline-offset-2 sm:px-3 sm:text-sm"
                          onClick={() => addToCart(item)}
                          aria-label={`Add ${item.name} to your order`}
                        >
                          <span className="grid size-6 shrink-0 place-items-center rounded-[3px] bg-gold text-base leading-none text-deep transition group-hover:bg-white" aria-hidden="true">+</span>
                          Add to Cart
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
            <p className="mt-5 text-xs leading-5 text-muted">
              All menu entries, prices, and food photographs are illustrative
              samples until Marvel’s Kitchen confirms the final menu.
            </p>
          </div>
        </section>

        <section className="relative overflow-hidden bg-forest text-white">
          <div className="container grid gap-8 py-16 sm:py-20 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <p className="eyebrow">A little something special</p>
              <h2 className="font-display text-4xl leading-tight sm:text-5xl">
                Good things are
                <br />
                <em className="text-[#e4c765]">worth sharing.</em>
              </h2>
              <p className="mt-4 max-w-xl text-sm leading-7 text-white/80 sm:text-base">
                Use this space to feature a real meal package, seasonal special,
                or promotion when you’re ready.
              </p>
              <span className="mt-4 inline-block border border-white/35 px-3 py-1 text-xs text-[#e8d58b]">
                Sample offer placeholder — replace before publishing
              </span>
            </div>
            <a href="#menu" className="button button-gold justify-self-start">
              Build your order <span aria-hidden="true">↓</span>
            </a>
          </div>
        </section>

        <section className="section-space bg-white">
          <div className="container">
            <div className="mb-9 text-center">
              <p className="eyebrow">The heart of our kitchen</p>
              <h2 className="section-title">Good food, good <em>feeling.</em></h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {values.map((value) => (
                <article key={value.title} className="min-h-48 border border-forest/10 bg-[#fffdfa] p-6 transition hover:-translate-y-1 hover:border-gold">
                  <span className="grid size-10 place-items-center bg-cream font-display text-xl text-gold" aria-hidden="true">{value.icon}</span>
                  <h3 className="mt-4 font-display text-lg font-semibold text-forest">{value.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted">{value.copy}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="gallery" className="section-space bg-[#f8f6f0]">
          <div className="container">
            <div className="mb-8 grid gap-4 md:grid-cols-[1fr_360px] md:items-end">
              <div>
                <p className="eyebrow">A feast for the eyes</p>
                <h2 className="section-title">From our table to <em>yours.</em></h2>
              </div>
              <p className="text-sm leading-7 text-muted">
                A little food inspiration while you decide what you’re craving.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:grid-rows-2 sm:gap-3">
              {photos.map((photo, index) => (
                <figure key={photo.src} className={`group relative h-40 overflow-hidden bg-[#e9e1d2] sm:h-48 ${index === 0 ? "col-span-2 sm:row-span-2 sm:h-full" : ""}`}>
                  <ItemPhoto src={photo.src} alt={photo.alt} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                  <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-deep/75 to-transparent px-3 pb-3 pt-8 font-display text-sm italic text-white sm:px-4 sm:text-base">{photo.caption}</figcaption>
                </figure>
              ))}
            </div>
            <p className="mt-4 text-xs text-muted">Gallery photographs are illustrative placeholders. Replace them with Marvel’s Kitchen food photography before launch.</p>
          </div>
        </section>

        <section id="reviews" className="section-space bg-white">
          <div className="container grid items-start gap-8 md:grid-cols-2 md:gap-16">
            <div>
              <p className="eyebrow">Your feedback matters</p>
              <h2 className="section-title">Share your <em>experience.</em></h2>
              <p className="body-copy mt-5">
                We welcome honest feedback. Your review opens as an email to
                Marvel’s Kitchen for you to check and send.
              </p>
            </div>
            <form className="soft-shadow grid gap-4 bg-cream p-5 sm:p-8" onSubmit={submitReview}>
              <label className="grid gap-2 text-sm font-semibold text-forest">
                Your name
                <input name="name" required autoComplete="name" className="min-h-11 border border-forest/15 bg-white px-3 font-normal text-ink" />
              </label>
              <label className="grid gap-2 text-sm font-semibold text-forest">
                Your rating
                <select name="rating" required defaultValue="" className="min-h-11 border border-forest/15 bg-white px-3 font-normal text-ink">
                  <option value="" disabled>Choose a rating</option>
                  <option value="5 out of 5">5 — Loved it</option>
                  <option value="4 out of 5">4 — Very good</option>
                  <option value="3 out of 5">3 — Good</option>
                  <option value="2 out of 5">2 — Could be better</option>
                  <option value="1 out of 5">1 — Needs improvement</option>
                </select>
              </label>
              <label className="grid gap-2 text-sm font-semibold text-forest">
                Your review
                <textarea name="message" rows={4} required className="resize-y border border-forest/15 bg-white px-3 py-2 font-normal text-ink" />
              </label>
              <button type="submit" className="button button-green w-full">Continue by email <span aria-hidden="true">↗</span></button>
              {reviewError && <p role="alert" className="text-sm text-red-800">{reviewError}</p>}
              {reviewSent && <p role="status" className="text-sm text-forest">{reviewMessage}</p>}
              <p className="text-xs leading-5 text-muted">No reviews or ratings are published on this website.</p>
            </form>
          </div>
        </section>

        <section id="contact" className="section-space bg-cream">
          <div className="container grid gap-10 lg:grid-cols-[1fr_.9fr] lg:gap-20">
            <div>
              <p className="eyebrow">We’d love to hear from you</p>
              <h2 className="font-display text-4xl font-medium leading-tight tracking-tight text-forest sm:text-6xl">
                Let’s make your
                <br />
                <em className="text-gold">day delicious.</em>
              </h2>
              <p className="body-copy mt-5 max-w-lg">
                Questions or feedback? Send us a message. For food orders, use
                the menu and checkout.
              </p>
              <div className="mt-8 grid gap-4">
                <a className="flex min-w-0 items-center gap-4" href={`tel:${business.phone}`}>
                  <span className="grid size-10 shrink-0 place-items-center border border-forest/15 text-forest" aria-hidden="true">☎</span>
                  <span><small className="block text-xs text-muted">Give us a call</small><strong className="text-sm text-forest">{business.phone}</strong></span>
                </a>
                <a className="flex min-w-0 items-center gap-4" href={`mailto:${business.email}`}>
                  <span className="grid size-10 shrink-0 place-items-center border border-forest/15 text-forest" aria-hidden="true">✉</span>
                  <span className="min-w-0"><small className="block text-xs text-muted">Send us an email</small><strong className="break-all text-sm text-forest">{business.email}</strong></span>
                </a>
                {whatsappNumber && (
                  <a className="flex min-w-0 items-center gap-4" href={`https://wa.me/${whatsappNumber}`} target="_blank" rel="noreferrer">
                    <span className="grid size-10 shrink-0 place-items-center border border-forest/15 text-forest" aria-hidden="true">◉</span>
                    <span><small className="block text-xs text-muted">Chat on WhatsApp</small><strong className="text-sm text-forest">0{whatsappNumber.slice(3)}</strong></span>
                  </a>
                )}
                <div className="flex min-w-0 items-center gap-4">
                  <span className="grid size-10 shrink-0 place-items-center border border-forest/15 text-forest" aria-hidden="true">⌖</span>
                  <span><small className="block text-xs text-muted">Find our kitchen</small><strong className="text-sm text-forest">{business.address}</strong></span>
                </div>
              </div>
            </div>
            <ContactForm whatsappNumber={whatsappNumber} />
          </div>
        </section>
      </main>

      <footer className="bg-deep py-7 text-white">
        <div className="container flex flex-col gap-5">
          <div className="flex flex-wrap items-center justify-between gap-5">
            <a href="#home" className="flex items-center gap-3">
              <Image src="/assets/marvels-kitchen-logo.png" alt="" width={60} height={60} className="size-14 object-contain" />
              <span className="font-display font-bold">{business.name}</span>
            </a>
            <nav aria-label="Footer navigation" className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-white/75">
              <a href="#about">Our Story</a><a href="#menu">Menu</a><a href="#gallery">Gallery</a><a href="#reviews">Reviews</a><a href="#contact">Contact</a>
            </nav>
            <a className="text-xs text-white/75" href="#home">Back to top <span className="text-gold">↑</span></a>
          </div>
          <div className="flex flex-col justify-between gap-2 border-t border-white/15 pt-4 text-xs text-white/55 sm:flex-row">
            <span>© {new Date().getFullYear()} {business.name}. All rights reserved.</span>
            <span>Good food, made with love in Nigeria.</span>
          </div>
        </div>
      </footer>

      <button
        type="button"
        aria-label={`Open shopping cart, ${itemCount} ${itemCount === 1 ? "item" : "items"}`}
        title={`Shopping cart (${itemCount})`}
        onClick={() => setCartOpen(true)}
        className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-4 z-40 grid size-14 place-items-center rounded-full border-2 border-gold bg-forest text-white shadow-xl transition hover:scale-105 hover:bg-deep focus-visible:outline-offset-4 sm:bottom-6 sm:right-6 sm:size-16"
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="size-6 sm:size-7">
          <path d="M3 4h2l2.2 11.1a2 2 0 0 0 2 1.6h8.5a2 2 0 0 0 1.9-1.4L21 8H6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="10" cy="20" r="1.25" fill="currentColor" />
          <circle cx="18" cy="20" r="1.25" fill="currentColor" />
        </svg>
        <span aria-hidden="true" className="absolute -right-1 -top-1 grid min-h-6 min-w-6 place-items-center rounded-full border-2 border-cream bg-gold px-1 text-xs font-bold leading-none text-deep">
          {itemCount > 99 ? "99+" : itemCount}
        </span>
        <span className="sr-only">Open shopping cart</span>
      </button>

      {cartOpen && (
        <div
          className="fixed inset-0 z-50 bg-deep/60"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setCartOpen(false);
          }}
        >
          <aside
            role="dialog"
            aria-modal="true"
            aria-labelledby="cart-heading"
            className="ml-auto flex h-[100dvh] w-full max-w-[500px] flex-col overflow-hidden bg-cream shadow-2xl"
          >
            <div className="flex shrink-0 items-center justify-between border-b border-forest/10 bg-white px-5 py-4 sm:px-7">
              <div>
                <p className="eyebrow mb-0">{business.name}</p>
                <h2 id="cart-heading" className="font-display text-2xl font-semibold text-forest">Your order</h2>
                <p className="text-xs text-muted">Review your items and order details</p>
              </div>
              <button type="button" aria-label="Close order" onClick={() => setCartOpen(false)} className="grid size-10 place-items-center border border-forest/15 text-2xl text-forest">×</button>
            </div>

            {completedOrder ? (
              <div className="overflow-y-auto p-6 sm:p-8">
                <div className="border-l-4 border-gold bg-white p-5">
                  <p className="eyebrow">
                    {completedOrder.status === "preview" ? "Preview only" : "Order saved"}
                  </p>
                  <h3 className="font-display text-2xl text-forest">
                    {completedOrder.status === "preview"
                      ? "Checkout preview is ready."
                      : "Thank you for your order enquiry."}
                  </h3>
                  <p className="mt-3 text-sm text-muted">Reference: <strong className="text-forest">{completedOrder.order_id}</strong></p>
                  <p className="mt-2 text-sm text-muted">
                    {completedOrder.status === "preview"
                      ? "The Rust order service is offline, so this test was not saved. The menu and prices shown are samples. WhatsApp will clearly mark this as a test if you choose to open it."
                      : "Your order has been recorded. Continue to WhatsApp to share it with the kitchen and confirm availability and delivery."}
                  </p>
                  <p className="mt-4 font-bold text-forest">Food subtotal: {formatNaira(completedOrder.subtotal_ngn)}</p>
                  {completedOrder.delivery_fee_ngn === null && (
                    <p className="mt-1 text-xs text-muted">Delivery fee and final total will be confirmed by the kitchen.</p>
                  )}
                  <a className="button button-green mt-5 w-full" href={completedOrder.whatsapp_url} target="_blank" rel="noreferrer">
                    {completedOrder.status === "preview"
                      ? "Open test message in WhatsApp"
                      : "Continue in WhatsApp"}{" "}
                    <span aria-hidden="true">↗</span>
                  </a>
                  <button type="button" onClick={() => { setCompletedOrder(null); setCartOpen(false); }} className="mt-4 w-full py-2 text-sm font-semibold text-forest underline underline-offset-4">
                    Continue browsing
                  </button>
                </div>
              </div>
            ) : (
              <div className="min-h-0 flex-1 overflow-y-auto p-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:p-7">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <h3 className="font-display text-lg font-semibold text-forest">Your items</h3>
                  {itemCount > 0 && (
                    <button
                      type="button"
                      className="text-xs text-muted underline underline-offset-4"
                      onClick={() => { setCart({}); setOrderError(""); }}
                    >
                      Clear order
                    </button>
                  )}
                </div>
                {cartItems.length === 0 ? (
                  <div className="border border-forest/10 bg-white p-5 text-sm text-muted">
                    Your order is empty. Add a meal from the menu to get started.
                    <button type="button" onClick={() => setCartOpen(false)} className="mt-4 block font-semibold text-forest underline underline-offset-4">Return to menu</button>
                  </div>
                ) : (
                  <div className="grid divide-y divide-forest/10">
                    {cartItems.map(({ item, quantity }) => (
                      <article key={item.id} className="grid grid-cols-[56px_minmax(0,1fr)_auto] items-center gap-3 py-3">
                        <ItemPhoto src={item.image_url} alt={item.image_alt} className="size-14 object-cover" />
                        <div className="min-w-0">
                          <h4 className="truncate font-display font-semibold text-forest">{item.name}</h4>
                          <p className="text-xs text-muted">{formatNaira(item.amount_ngn)} each</p>
                          {isSoup(item) && <p className="text-[.68rem] font-semibold text-forest">Complimentary swallow included</p>}
                        </div>
                        <div className="flex items-center gap-2">
                          <button type="button" aria-label={`Remove one ${item.name}`} onClick={() => changeQuantity(item.id, -1)} className="grid size-8 place-items-center border border-forest/15 bg-white text-forest">−</button>
                          <span className="min-w-4 text-center text-sm font-bold">{quantity}</span>
                          <button type="button" aria-label={`Add one ${item.name}`} onClick={() => changeQuantity(item.id, 1)} className="grid size-8 place-items-center border border-forest/15 bg-white text-forest">+</button>
                        </div>
                        <strong className="col-span-3 text-right text-sm text-forest">{formatNaira(item.amount_ngn * quantity)}</strong>
                      </article>
                    ))}
                  </div>
                )}

                <div className="my-5 grid gap-2 bg-white p-4 text-sm">
                  <div className="flex justify-between gap-3 text-muted"><span>Food subtotal</span><strong className="text-ink">{formatNaira(subtotal)}</strong></div>
                  <div className="flex justify-between gap-3 text-muted">
                    <span>Delivery fee</span>
                    <strong className="text-right text-ink">{fulfillment === "Pickup" ? "Not applicable for pickup" : fulfillment === "Delivery" ? "Confirmed by kitchen" : "Choose pickup or delivery"}</strong>
                  </div>
                  <div className="mt-1 flex justify-between gap-3 border-t border-forest/10 pt-3 font-bold text-forest"><span>Total to confirm</span><strong>{formatNaira(subtotal)}{fulfillment === "Delivery" ? " + delivery" : ""}</strong></div>
                  <p className="text-xs leading-5 text-muted">{fulfillment === "Delivery" ? "Delivery fee and final total will be confirmed by the kitchen before payment." : fulfillment === "Pickup" ? "Pickup total is the food subtotal. The kitchen will confirm availability before payment." : "Choose pickup or delivery. Delivery fees are confirmed by the kitchen."}</p>
                </div>

                {cartItems.length > 0 && (
                  <form className="grid gap-3 border-t border-forest/10 pt-5" onSubmit={submitOrder}>
                    <p className="eyebrow mb-0">Your details</p>
                    <label className="grid gap-1.5 text-xs font-bold text-forest">
                      Full name *
                      <input name="name" required autoComplete="name" className="min-h-11 border border-forest/15 bg-white px-3 text-sm font-normal text-ink" placeholder="Name for this order" />
                    </label>
                    <label className="grid gap-1.5 text-xs font-bold text-forest">
                      Phone number *
                      <input name="phone" type="tel" required autoComplete="tel" className="min-h-11 border border-forest/15 bg-white px-3 text-sm font-normal text-ink" placeholder="Number we can reach you on" />
                    </label>
                    <label className="grid gap-1.5 text-xs font-bold text-forest">
                      Email address <span className="font-normal text-muted">(optional)</span>
                      <input name="email" type="email" autoComplete="email" className="min-h-11 border border-forest/15 bg-white px-3 text-sm font-normal text-ink" placeholder="you@example.com" />
                    </label>
                    <label className="grid gap-1.5 text-xs font-bold text-forest">
                      Pickup or delivery? *
                      <select value={fulfillment} onChange={(event) => setFulfillment(event.target.value as Fulfillment)} required className="min-h-11 border border-forest/15 bg-white px-3 text-sm font-normal text-ink">
                        <option value="">Choose an option</option>
                        <option value="Pickup">Pickup</option>
                        <option value="Delivery">Delivery</option>
                      </select>
                    </label>
                    {fulfillment === "Delivery" && (
                      <label className="grid gap-1.5 text-xs font-bold text-forest">
                        Delivery address *
                        <textarea name="deliveryAddress" required rows={2} className="resize-y border border-forest/15 bg-white px-3 py-2 text-sm font-normal text-ink" placeholder="House number, street, area, and useful directions" />
                        <span className="font-normal text-muted">Delivery availability and fee will be confirmed by the kitchen.</span>
                      </label>
                    )}
                    {containsSoup && (
                      <label className="grid gap-1.5 text-xs font-bold text-forest">
                        Complimentary swallow choice *
                        <input name="preferredSwallow" required className="min-h-11 border border-forest/15 bg-white px-3 text-sm font-normal text-ink" placeholder="Tell us your preferred swallow" />
                        <span className="font-normal text-muted">One complimentary swallow is included per soup serving.</span>
                      </label>
                    )}
                    <label className="grid gap-1.5 text-xs font-bold text-forest">
                      Additional order notes <span className="font-normal text-muted">(optional)</span>
                      <textarea name="notes" rows={3} className="resize-y border border-forest/15 bg-white px-3 py-2 text-sm font-normal text-ink" placeholder="Allergies or other requests" />
                    </label>
                    {orderError && <p role="alert" className="border border-red-900/15 bg-red-50 p-3 text-sm text-red-900">{orderError}</p>}
                    <button type="submit" disabled={savingOrder || loadingMenu} className="button button-green w-full disabled:cursor-wait disabled:opacity-65">
                      {savingOrder
                        ? "Preparing checkout…"
                        : menuError
                          ? "Preview checkout"
                          : "Save order & continue to WhatsApp"}
                      {!savingOrder && <span aria-hidden="true">↗</span>}
                    </button>
                    <p className="text-xs leading-5 text-muted">
                      {menuError
                        ? "Preview checkout is not saved. Any WhatsApp message is labelled as a test; do not use this preview to place a real order."
                        : "Your order is saved securely before WhatsApp opens. No payment is taken here; the kitchen will confirm availability and final delivery costs."}
                    </p>
                  </form>
                )}
              </div>
            )}
          </aside>
        </div>
      )}
    </>
  );
}

function ContactForm({ whatsappNumber }: { whatsappNumber: string }) {
  const [status, setStatus] = useState("");

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = String(data.get("name") ?? "").trim();
    const phone = String(data.get("phone") ?? "").trim();
    const type = String(data.get("type") ?? "");
    const message = String(data.get("message") ?? "").trim();
    const text = [
      `Hello ${business.name}!`,
      `My name is ${name}.`,
      phone ? `My phone number is ${phone}.` : "",
      `Enquiry: ${type}.`,
      `Message: ${message}`,
    ].filter(Boolean).join("\n");
    if (!whatsappNumber) {
      setStatus("WhatsApp contact is unavailable. Please try again in a moment.");
      return;
    }
    const url = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank", "noopener,noreferrer");
    setStatus("Your message is ready to review and send in WhatsApp.");
  }

  return (
    <form className="soft-shadow grid gap-4 bg-white p-5 sm:p-8" onSubmit={submit}>
      <div>
        <p className="eyebrow mb-1">A note to our kitchen</p>
        <h3 className="font-display text-2xl font-semibold text-forest">Send an enquiry</h3>
        <p className="mt-1 text-sm text-muted">General questions are sent to WhatsApp. Use the menu basket for food orders.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2 text-sm font-semibold text-forest">Your name *
          <input name="name" required autoComplete="name" className="min-h-11 border border-forest/15 px-3 font-normal text-ink" placeholder="e.g. Ada" />
        </label>
        <label className="grid gap-2 text-sm font-semibold text-forest">Phone number
          <input name="phone" type="tel" autoComplete="tel" className="min-h-11 border border-forest/15 px-3 font-normal text-ink" placeholder="e.g. 080 1234 5678" />
        </label>
      </div>
      <label className="grid gap-2 text-sm font-semibold text-forest">What can we help with?
        <select name="type" className="min-h-11 border border-forest/15 bg-white px-3 font-normal text-ink">
          <option>General question</option><option>Menu and prices</option><option>Delivery or pickup information</option><option>Event enquiry</option><option>Something else</option>
        </select>
      </label>
      <label className="grid gap-2 text-sm font-semibold text-forest">Your message *
        <textarea name="message" required rows={4} className="resize-y border border-forest/15 px-3 py-2 font-normal text-ink" placeholder="Tell us what you have in mind..." />
      </label>
      <button type="submit" disabled={!whatsappNumber} className="button button-green w-full disabled:opacity-60">Continue in WhatsApp <span aria-hidden="true">↗</span></button>
      {status && <p role="status" className="text-sm text-forest">{status}</p>}
      <p className="text-xs leading-5 text-muted">The form does not store your message. WhatsApp opens for you to review and send it.</p>
    </form>
  );
}
