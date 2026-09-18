import { Router } from "express";
import type { Dependencies } from "../dependencies.ts";
import { getCurrentSession } from "../auth/sessions.ts";
import { findOrderById, listAllOrders, listOrderItems, listOrdersForUser, type Order } from "../orders/index.ts";
import { listProducts } from "../products.ts";
import { findApiKey } from "../auth/apiKeys.ts";
import { DatabaseSync } from "node:sqlite";

type ProductResponse = {
  id: number;
  name: string;
  description: string;
  image_path: string;
  price_cents: number;
};

type OrderResponse = {
  id: number;
  status: Order["status"];
  total_cents: number;
  created_at: string;
};

type OrderItemResponse = {
  product_id: number;
  product_name: string;
  quantity: number;
  price_cents: number;
};

function toProductResponse(db: DatabaseSync): ProductResponse[] {
  const products = listProducts(db)
  const result = products.map((item) => {
    return {
      id: item.id,
      name: item.name,
      description: item.description,
      image_path: item.image_path,
      price_cents: item.price_cents,
    }
  });
  return result;
}

function toOrderResponse(db: DatabaseSync, id: number): OrderResponse[] {
  const orders = listOrdersForUser(db, id);
  const result = orders.map((item) => {
    return {
      id: item.id,
      status: item.status,
      total_cents: item.total_cents,
      created_at: item.created_at,
    }
  });
  return result;
}

function toOrderItemResponse(db: DatabaseSync, id: number): OrderItemResponse[] {
  const orderItems = listOrderItems(db, id);
  const result = orderItems.map((item) => {
    return {
      product_id: item.product_id,
      product_name: item.product_name,
      quantity: item.quantity,
      price_cents: item.price_cents,
    }
  });
  return result;
}

export function createApiRouter(deps: Dependencies): Router {
  const { db } = deps;
  const router = Router();

  router.get("/api/account/orders", (req, res) => {
    const current = getCurrentSession(db, req.header("cookie"));
    if (!current) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    res.json({ orders: toOrderResponse(db, current.user.id) });
  });

  router.get("/api/orders/:id", (req, res) => {
    const current = getCurrentSession(db, req.header("cookie"));
    if (!current) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    const orderId = Number(req.params.id);
    if (!Number.isSafeInteger(orderId)) {
      res.status(404).json({ error: "Order not found" });
      return;
    }

    const order = findOrderById(db, orderId);
    if (!order || order.user_id !== current.user.id) {
      res.status(404).json({ error: "Order not found" });
      return;
    }
    const orderResponse = {
      id: order.id,
      status: order.status,
      total_cents: order.total_cents,
      created_at: order.created_at,
    }

    res.json({ order: orderResponse, items: toOrderItemResponse(db, order.id) });
  });

  router.get("/api/products", (_req, res) => {
    res.json({ products: toProductResponse(db) });
  });

  router.get("/api/integrations/warehouse/orders", (_req, res) => {
    const apiKey = _req.header("x-api-key");

    if (!apiKey) {
      res.status(401).json({ message: "Missing API Key in header" });
      return;
    }

    const result = findApiKey(db, apiKey as string);
    if (!result) {
      res.status(401).json({ message: "Invalid API Key in header" });
      return;
    }
    if (!result.scope.includes("orders:read")) {
      res.status(403).json({ message: "Unauthorized API Key in header" });
      return;
    }

    const orders = listAllOrders(db).map((order) => ({
      id: order.id,
      status: order.status,
      total_cents: order.total_cents,
      created_at: order.created_at,
    }));

    res.json({
      integration: "Warehouse Fulfillment Integration",
      orders,
    });
  });

  return router;
}
