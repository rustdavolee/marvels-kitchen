# Marvel’s Kitchen

A responsive, single-page website made with HTML, CSS, and vanilla JavaScript. It runs directly in a browser and has no build step, framework, server, or database requirement.

## Run the website

1. Open this project folder in Visual Studio Code.
2. Open `index.html` in a browser. You can also use a local static preview extension such as Live Server.
3. An internet connection is needed to load the illustrative Unsplash food photographs and optional Google Fonts. If a photograph cannot load, the page uses the local image at `assets/food-placeholder.svg`.

The original supplied `marvels_kitchen_website.html` has been left untouched. The supplied logo is reused from `assets/marvels-kitchen-logo.png`.

## Update before launch

- **WhatsApp number:** Edit the clearly labelled `BUSINESS.whatsapp` value near the top of `script.js`. Use the international country code and omit the leading zero (for example, convert a local `080...` number to `23480...`).
- **Phone, email, and address:** Update the `BUSINESS` object in `script.js` and the corresponding visible contact details and links in `index.html`. The address currently is an editable placeholder.
- **Menu:** Edit the `MENU_ITEMS` array in `script.js`. Each item contains a name, description, numeric price in naira, category, photograph URL, and alternative text. Prices and dishes currently shown are sample placeholders, not verified business details.
- **Offers:** Replace the labelled sample promotion in the offers section of `index.html` with a genuine current offer, or remove that section.
- **Photography:** Replace the illustrative Unsplash image URLs in `index.html` and `script.js` with photographs you have permission to use. Local images can be placed in `assets/` and referenced with paths such as `assets/my-dish.jpg`.
- **Logo:** Replace `assets/marvels-kitchen-logo.png` with the final business logo if needed, keeping the same filename or updating both image references in `index.html`.
- **Reviews:** Visitors can submit feedback using the review form; it opens an email to the business for the visitor to review and send. Add published testimonials only when you have authentic customer reviews and permission to share them.

Customers can add menu items to the on-site order basket, adjust quantities, and enter pickup or delivery details. Every soup comes with one complimentary swallow of the customer's choice; ask customers to specify their selection in the order notes. Checkout prepares the complete order summary in WhatsApp for the customer to review and send to the business. The website does not take payment, store or automatically submit orders, or store personal information. Review and general-enquiry forms open the visitor's email or WhatsApp app respectively; the visitor must send each message.

## Publish

Upload this folder’s website files and `assets/` directory to any static web host, such as GitHub Pages, Netlify, or a standard web host. Keep `index.html`, `style.css`, `script.js`, and `assets/` together in the published site root. No build or package installation is required.
