import { Router } from "express";
import type { Dependencies } from "../dependencies.ts";
import { getCurrentSession } from "../auth/sessions.ts";
import { listCartItems } from "../cart.ts";
import {
  listProducts,
  listPublicProducts,
  searchProducts,
  searchPublicProducts,
} from "../products.ts";
import { renderSearchPage, renderStorefrontPage } from "../views/storefront.ts";
import { createRateLimiter } from "../security/rateLimit.ts";
import { sendErrorPage } from "../errors.ts";

export function createStorefrontRouter(deps: Dependencies): Router {
  const { db } = deps;
  const router = Router();

  const searchRateLimiter = createRateLimiter({
    windowSeconds: 1,
    max: 5,
    key: () => "global-search-throttle",
    onLimit: (_req, res) => {
      sendErrorPage(
        res,
        429,
        "Too Many Requests",
        "Too many requests. Please try again later.",
      );
    },
  });

  router.get("/", (req, res) => {
    const current = getCurrentSession(db, req.header("cookie"));
    const products = listPublicProducts(db, deps.maxPublicProductResults);
    const cartQuantities = current
      ? getCartQuantities(current.user.id)
      : new Map<number, number>();

    res
      .type("html")
      .send(renderStorefrontPage(current, products, cartQuantities));
  });

  router.get("/search", searchRateLimiter, (req, res) => {
    const current = getCurrentSession(db, req.header("cookie"));
    const cartQuantities = current
      ? getCartQuantities(current.user.id)
      : new Map<number, number>();
    const query = String(req.query.q ?? "").trim();
    const products =
      query.length > 0
        ? searchPublicProducts(db, query, deps.maxPublicProductResults)
        : [];
    res
      .type("html")
      .send(renderSearchPage(current, query, products, cartQuantities));
  });

  function getCartQuantities(userId: number): Map<number, number> {
    return new Map(
      listCartItems(db, userId).map((cartItem) => [
        cartItem.product_id,
        cartItem.quantity,
      ]),
    );
  }

  return router;
}
