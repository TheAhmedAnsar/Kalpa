import { useCallback, useEffect, useMemo, useState } from "react";
import { Skeleton } from "@mui/material";
import { useSnackbar } from "notistack";
import PageLayout from "../../../components/PageLayout";
import SearchBar from "../../../components/SearchBar";
import apiClient from "../../../api/client";
import { useNavigate } from "react-router-dom";

const SAMPLE_ORDERS = [
  {
    id: "JM-ORD-3001",
    shipmentId: "17663311290791236781J",
    orderId: "17663311121509720A",
    orderDate: "2025-12-21T21:02:09+00:00",
    status: "placed",
    paymentType: "COD",
    skuImage:
      "https://images.seller.jiomart.com/img/c/images/othe/hhfruy/.j/pg/1017174271.jpg.f1a7893290.jpg.M7lS.999xx.jpg",
    skuName: "Baidyanath Isabgol - Psyllium Husk Powder - 100gm (Pack of 2)",
    skuCode: "RV8VVKJMNN",
    vertical: "GROCERIES",
    assignedStore: "SIDDHAYU HEALTHCARE PRIVATE LIMITED",
  },
  {
    id: "JM-ORD-3002",
    shipmentId: "17663311290791236782K",
    orderId: "17663311121509721B",
    orderDate: "2025-12-21T21:10:00+00:00",
    status: "packed",
    paymentType: "COD",
    skuImage:
      "https://images.seller.jiomart.com/img/c/images/othe/hhfruy/.j/pg/1017174271.jpg.f1a7893290.jpg.M7lS.999xx.jpg",
    skuName: "Baidyanath Isabgol - Psyllium Husk Powder - 100gm (Pack of 2)",
    skuCode: "RV8VVKJMNN",
    vertical: "GROCERIES",
    assignedStore: "SIDDHAYU HEALTHCARE PRIVATE LIMITED",
  },
  {
    id: "JM-ORD-3003",
    shipmentId: "17663311290791236783L",
    orderId: "17663311121509722C",
    orderDate: "2025-12-22T09:05:00+00:00",
    status: "shipped",
    paymentType: "COD",
    skuImage:
      "https://images.seller.jiomart.com/img/c/images/othe/hhfruy/.j/pg/1017174271.jpg.f1a7893290.jpg.M7lS.999xx.jpg",
    skuName: "Baidyanath Isabgol - Psyllium Husk Powder - 100gm (Pack of 2)",
    skuCode: "RV8VVKJMNN",
    vertical: "GROCERIES",
    assignedStore: "SIDDHAYU HEALTHCARE PRIVATE LIMITED",
  },
  {
    id: "JM-ORD-3004",
    shipmentId: "17663311290791236784M",
    orderId: "17663311121509723D",
    orderDate: "2025-12-22T14:30:00+00:00",
    status: "out_for_delivery",
    paymentType: "COD",
    skuImage:
      "https://images.seller.jiomart.com/img/c/images/othe/hhfruy/.j/pg/1017174271.jpg.f1a7893290.jpg.M7lS.999xx.jpg",
    skuName: "Baidyanath Isabgol - Psyllium Husk Powder - 100gm (Pack of 2)",
    skuCode: "RV8VVKJMNN",
    vertical: "GROCERIES",
    assignedStore: "SIDDHAYU HEALTHCARE PRIVATE LIMITED",
  },
  {
    id: "JM-ORD-3005",
    shipmentId: "17663311290791236785N",
    orderId: "17663311121509724E",
    orderDate: "2025-12-22T18:45:00+00:00",
    status: "delivered",
    paymentType: "COD",
    skuImage:
      "https://images.seller.jiomart.com/img/c/images/othe/hhfruy/.j/pg/1017174271.jpg.f1a7893290.jpg.M7lS.999xx.jpg",
    skuName: "Baidyanath Isabgol - Psyllium Husk Powder - 100gm (Pack of 2)",
    skuCode: "RV8VVKJMNN",
    vertical: "GROCERIES",
    assignedStore: "SIDDHAYU HEALTHCARE PRIVATE LIMITED",
  },

  // cancelled cases
  {
    id: "JM-ORD-3006",
    shipmentId: "17663311290791236786P",
    orderId: "17663311121509725F",
    orderDate: "2025-12-23T09:20:00+00:00",
    status: "cancelled",
    paymentType: "COD",
    skuImage:
      "https://images.seller.jiomart.com/img/c/images/othe/hhfruy/.j/pg/1017174271.jpg.f1a7893290.jpg.M7lS.999xx.jpg",
    skuName: "Baidyanath Isabgol - Psyllium Husk Powder - 100gm (Pack of 2)",
    skuCode: "RV8VVKJMNN",
    vertical: "GROCERIES",
    assignedStore: "SIDDHAYU HEALTHCARE PRIVATE LIMITED",
  },
  {
    id: "JM-ORD-3007",
    shipmentId: "17663311290791236787Q",
    orderId: "17663311121509726G",
    orderDate: "2025-12-23T11:00:00+00:00",
    status: "placed",
    paymentType: "COD",
    skuImage:
      "https://images.seller.jiomart.com/img/c/images/othe/hhfruy/.j/pg/1017174271.jpg.f1a7893290.jpg.M7lS.999xx.jpg",
    skuName: "Baidyanath Isabgol - Psyllium Husk Powder - 100gm (Pack of 2)",
    skuCode: "RV8VVKJMNN",
    vertical: "GROCERIES",
    assignedStore: "SIDDHAYU HEALTHCARE PRIVATE LIMITED",
  },
  {
    id: "JM-ORD-3008",
    shipmentId: "17663311290791236788R",
    orderId: "17663311121509727H",
    orderDate: "2025-12-23T13:45:00+00:00",
    status: "packed",
    paymentType: "COD",
    skuImage:
      "https://images.seller.jiomart.com/img/c/images/othe/hhfruy/.j/pg/1017174271.jpg.f1a7893290.jpg.M7lS.999xx.jpg",
    skuName: "Baidyanath Isabgol - Psyllium Husk Powder - 100gm (Pack of 2)",
    skuCode: "RV8VVKJMNN",
    vertical: "GROCERIES",
    assignedStore: "SIDDHAYU HEALTHCARE PRIVATE LIMITED",
  },
  {
    id: "JM-ORD-3009",
    shipmentId: "17663311290791236789S",
    orderId: "17663311121509728I",
    orderDate: "2025-12-24T09:15:00+00:00",
    status: "shipped",
    paymentType: "COD",
    skuImage:
      "https://images.seller.jiomart.com/img/c/images/othe/hhfruy/.j/pg/1017174271.jpg.f1a7893290.jpg.M7lS.999xx.jpg",
    skuName: "Baidyanath Isabgol - Psyllium Husk Powder - 100gm (Pack of 2)",
    skuCode: "RV8VVKJMNN",
    vertical: "GROCERIES",
    assignedStore: "SIDDHAYU HEALTHCARE PRIVATE LIMITED",
  },
  {
    id: "JM-ORD-3010",
    shipmentId: "17663311290791236790T",
    orderId: "17663311121509729J",
    orderDate: "2025-12-24T14:10:00+00:00",
    status: "out_for_delivery",
    paymentType: "COD",
    skuImage:
      "https://images.seller.jiomart.com/img/c/images/othe/hhfruy/.j/pg/1017174271.jpg.f1a7893290.jpg.M7lS.999xx.jpg",
    skuName: "Baidyanath Isabgol - Psyllium Husk Powder - 100gm (Pack of 2)",
    skuCode: "RV8VVKJMNN",
    vertical: "GROCERIES",
    assignedStore: "SIDDHAYU HEALTHCARE PRIVATE LIMITED",
  },
  {
    id: "JM-ORD-3011",
    shipmentId: "17663311290791236791U",
    orderId: "17663311121509730K",
    orderDate: "2025-12-24T18:30:00+00:00",
    status: "delivered",
    paymentType: "COD",
    skuImage:
      "https://images.seller.jiomart.com/img/c/images/othe/hhfruy/.j/pg/1017174271.jpg.f1a7893290.jpg.M7lS.999xx.jpg",
    skuName: "Baidyanath Isabgol - Psyllium Husk Powder - 100gm (Pack of 2)",
    skuCode: "RV8VVKJMNN",
    vertical: "GROCERIES",
    assignedStore: "SIDDHAYU HEALTHCARE PRIVATE LIMITED",
  },
  {
    id: "JM-ORD-3012",
    shipmentId: "17663311290791236792V",
    orderId: "17663311121509731L",
    orderDate: "2025-12-25T09:00:00+00:00",
    status: "placed",
    paymentType: "COD",
    skuImage:
      "https://images.seller.jiomart.com/img/c/images/othe/hhfruy/.j/pg/1017174271.jpg.f1a7893290.jpg.M7lS.999xx.jpg",
    skuName: "Baidyanath Isabgol - Psyllium Husk Powder - 100gm (Pack of 2)",
    skuCode: "RV8VVKJMNN",
    vertical: "GROCERIES",
    assignedStore: "SIDDHAYU HEALTHCARE PRIVATE LIMITED",
  },
  {
    id: "JM-ORD-3013",
    shipmentId: "17663311290791236793W",
    orderId: "17663311121509732M",
    orderDate: "2025-12-25T11:45:00+00:00",
    status: "packed",
    paymentType: "COD",
    skuImage:
      "https://images.seller.jiomart.com/img/c/images/othe/hhfruy/.j/pg/1017174271.jpg.f1a7893290.jpg.M7lS.999xx.jpg",
    skuName: "Baidyanath Isabgol - Psyllium Husk Powder - 100gm (Pack of 2)",
    skuCode: "RV8VVKJMNN",
    vertical: "GROCERIES",
    assignedStore: "SIDDHAYU HEALTHCARE PRIVATE LIMITED",
  },
  {
    id: "JM-ORD-3014",
    shipmentId: "17663311290791236794X",
    orderId: "17663311121509733N",
    orderDate: "2025-12-25T15:20:00+00:00",
    status: "shipped",
    paymentType: "COD",
    skuImage:
      "https://images.seller.jiomart.com/img/c/images/othe/hhfruy/.j/pg/1017174271.jpg.f1a7893290.jpg.M7lS.999xx.jpg",
    skuName: "Baidyanath Isabgol - Psyllium Husk Powder - 100gm (Pack of 2)",
    skuCode: "RV8VVKJMNN",
    vertical: "GROCERIES",
    assignedStore: "SIDDHAYU HEALTHCARE PRIVATE LIMITED",
  },
  {
    id: "JM-ORD-3015",
    shipmentId: "17663311290791236795Y",
    orderId: "17663311121509734O",
    orderDate: "2025-12-25T19:10:00+00:00",
    status: "delivered",
    paymentType: "COD",
    skuImage:
      "https://images.seller.jiomart.com/img/c/images/othe/hhfruy/.j/pg/1017174271.jpg.f1a7893290.jpg.M7lS.999xx.jpg",
    skuName: "Baidyanath Isabgol - Psyllium Husk Powder - 100gm (Pack of 2)",
    skuCode: "RV8VVKJMNN",
    vertical: "GROCERIES",
    assignedStore: "SIDDHAYU HEALTHCARE PRIVATE LIMITED",
  },
];

const STATUS_TONES = {
  bag_confirmed:
    "bg-lime-50 text-lime-800 ring-1 ring-inset ring-lime-400/40 dark:bg-lime-500/15 dark:text-lime-200",
  bag_invoiced:
    "bg-emerald-50 text-emerald-800 ring-1 ring-inset ring-emerald-400/40 dark:bg-emerald-500/15 dark:text-emerald-200",
  bag_lost:
    "bg-teal-50 text-teal-800 ring-1 ring-inset ring-teal-400/40 dark:bg-teal-500/15 dark:text-teal-200",
  bag_not_confirmed:
    "bg-cyan-50 text-cyan-800 ring-1 ring-inset ring-cyan-400/40 dark:bg-cyan-500/15 dark:text-cyan-200",
  bag_not_picked:
    "bg-sky-50 text-sky-800 ring-1 ring-inset ring-sky-400/40 dark:bg-sky-500/15 dark:text-sky-200",
  bag_packed:
    "bg-blue-50 text-blue-800 ring-1 ring-inset ring-blue-400/40 dark:bg-blue-500/15 dark:text-blue-200",
  bag_pick_failed:
    "bg-indigo-50 text-indigo-800 ring-1 ring-inset ring-indigo-400/40 dark:bg-indigo-500/15 dark:text-indigo-200",
  bag_picked:
    "bg-violet-50 text-violet-800 ring-1 ring-inset ring-violet-400/40 dark:bg-violet-500/15 dark:text-violet-200",
  bag_rescheduled:
    "bg-purple-50 text-purple-800 ring-1 ring-inset ring-purple-400/40 dark:bg-purple-500/15 dark:text-purple-200",
  cancelled_at_dp:
    "bg-fuchsia-50 text-fuchsia-800 ring-1 ring-inset ring-fuchsia-400/40 dark:bg-fuchsia-500/15 dark:text-fuchsia-200",
  cancelled_customer:
    "bg-pink-50 text-pink-800 ring-1 ring-inset ring-pink-400/40 dark:bg-pink-500/15 dark:text-pink-200",
  cancelled_failed_at_dp:
    "bg-rose-50 text-rose-800 ring-1 ring-inset ring-rose-400/40 dark:bg-rose-500/15 dark:text-rose-200",
  cancelled_fynd:
    "bg-red-50 text-red-800 ring-1 ring-inset ring-red-400/40 dark:bg-red-500/15 dark:text-red-200",
  cancelled_operations:
    "bg-orange-50 text-orange-800 ring-1 ring-inset ring-orange-400/40 dark:bg-orange-500/15 dark:text-orange-200",
  cancelled_seller:
    "bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-400/40 dark:bg-amber-500/15 dark:text-amber-200",
  deadstock:
    "bg-yellow-50 text-yellow-800 ring-1 ring-inset ring-yellow-400/40 dark:bg-yellow-500/15 dark:text-yellow-200",
  delivery_attempt_failed:
    "bg-green-50 text-green-800 ring-1 ring-inset ring-green-400/40 dark:bg-green-500/15 dark:text-green-200",
  delivery_done:
    "bg-lime-100 text-lime-900 ring-1 ring-inset ring-lime-500/40 dark:bg-lime-500/20 dark:text-lime-100",
  dp_assigned:
    "bg-emerald-100 text-emerald-900 ring-1 ring-inset ring-emerald-500/40 dark:bg-emerald-500/20 dark:text-emerald-100",
  dp_not_assigned:
    "bg-teal-100 text-teal-900 ring-1 ring-inset ring-teal-500/40 dark:bg-teal-500/20 dark:text-teal-100",
  edd_updated:
    "bg-cyan-100 text-cyan-900 ring-1 ring-inset ring-cyan-500/40 dark:bg-cyan-500/20 dark:text-cyan-100",
  in_transit:
    "bg-sky-100 text-sky-900 ring-1 ring-inset ring-sky-500/40 dark:bg-sky-500/20 dark:text-sky-100",
  out_for_delivery:
    "bg-blue-100 text-blue-900 ring-1 ring-inset ring-blue-500/40 dark:bg-blue-500/20 dark:text-blue-100",
  out_for_pickup:
    "bg-indigo-100 text-indigo-900 ring-1 ring-inset ring-indigo-500/40 dark:bg-indigo-500/20 dark:text-indigo-100",
  partial_dsr:
    "bg-violet-100 text-violet-900 ring-1 ring-inset ring-violet-500/40 dark:bg-violet-500/20 dark:text-violet-100",
  payment_failed:
    "bg-purple-100 text-purple-900 ring-1 ring-inset ring-purple-500/40 dark:bg-purple-500/20 dark:text-purple-100",
  payment_initiated:
    "bg-fuchsia-100 text-fuchsia-900 ring-1 ring-inset ring-fuchsia-500/40 dark:bg-fuchsia-500/20 dark:text-fuchsia-100",
  pending:
    "bg-pink-100 text-pink-900 ring-1 ring-inset ring-pink-500/40 dark:bg-pink-500/20 dark:text-pink-100",
  placed:
    "bg-rose-100 text-rose-900 ring-1 ring-inset ring-rose-500/40 dark:bg-rose-500/20 dark:text-rose-100",
  refund_acknowledged:
    "bg-red-100 text-red-900 ring-1 ring-inset ring-red-500/40 dark:bg-red-500/20 dark:text-red-100",
  refund_approved:
    "bg-orange-100 text-orange-900 ring-1 ring-inset ring-orange-500/40 dark:bg-orange-500/20 dark:text-orange-100",
  refund_completed:
    "bg-amber-100 text-amber-900 ring-1 ring-inset ring-amber-500/40 dark:bg-amber-500/20 dark:text-amber-100",
  refund_failed:
    "bg-yellow-100 text-yellow-900 ring-1 ring-inset ring-yellow-500/40 dark:bg-yellow-500/20 dark:text-yellow-100",
  refund_initiated:
    "bg-green-100 text-green-900 ring-1 ring-inset ring-green-500/40 dark:bg-green-500/20 dark:text-green-100",
  refund_on_hold:
    "bg-lime-50 text-lime-700 ring-1 ring-inset ring-lime-500/30 dark:bg-lime-500/10 dark:text-lime-200",
  refund_pending_for_approval:
    "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200",
  refund_retry:
    "bg-teal-50 text-teal-700 ring-1 ring-inset ring-teal-500/30 dark:bg-teal-500/10 dark:text-teal-200",
  refund_without_return:
    "bg-cyan-50 text-cyan-700 ring-1 ring-inset ring-cyan-500/30 dark:bg-cyan-500/10 dark:text-cyan-200",
  rejected_by_customer:
    "bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-500/30 dark:bg-sky-500/10 dark:text-sky-200",
  return_accepted:
    "bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-500/30 dark:bg-blue-500/10 dark:text-blue-200",
  return_bag_delivered:
    "bg-indigo-50 text-indigo-700 ring-1 ring-inset ring-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-200",
  return_bag_in_transit:
    "bg-violet-50 text-violet-700 ring-1 ring-inset ring-violet-500/30 dark:bg-violet-500/10 dark:text-violet-200",
  return_bag_lost:
    "bg-purple-50 text-purple-700 ring-1 ring-inset ring-purple-500/30 dark:bg-purple-500/10 dark:text-purple-200",
  return_bag_not_delivered:
    "bg-fuchsia-50 text-fuchsia-700 ring-1 ring-inset ring-fuchsia-500/30 dark:bg-fuchsia-500/10 dark:text-fuchsia-200",
  return_bag_not_picked:
    "bg-pink-50 text-pink-700 ring-1 ring-inset ring-pink-500/30 dark:bg-pink-500/10 dark:text-pink-200",
  return_bag_out_for_delivery:
    "bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200",
  return_bag_picked:
    "bg-red-50 text-red-700 ring-1 ring-inset ring-red-500/30 dark:bg-red-500/10 dark:text-red-200",
  return_cancelled_at_dp:
    "bg-orange-50 text-orange-700 ring-1 ring-inset ring-orange-500/30 dark:bg-orange-500/10 dark:text-orange-200",
  return_cancelled_failed_at_dp:
    "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200",
  return_completed:
    "bg-yellow-50 text-yellow-700 ring-1 ring-inset ring-yellow-500/30 dark:bg-yellow-500/10 dark:text-yellow-200",
  return_delay_in_transit:
    "bg-green-50 text-green-700 ring-1 ring-inset ring-green-500/30 dark:bg-green-500/10 dark:text-green-200",
  return_delivery_attempt_failed:
    "bg-lime-100 text-lime-800 ring-1 ring-inset ring-lime-600/30 dark:bg-lime-500/25 dark:text-lime-100",
  return_dp_assigned:
    "bg-emerald-100 text-emerald-800 ring-1 ring-inset ring-emerald-600/30 dark:bg-emerald-500/25 dark:text-emerald-100",
  return_dp_cancelled:
    "bg-teal-100 text-teal-800 ring-1 ring-inset ring-teal-600/30 dark:bg-teal-500/25 dark:text-teal-100",
  return_dp_not_assigned:
    "bg-cyan-100 text-cyan-800 ring-1 ring-inset ring-cyan-600/30 dark:bg-cyan-500/25 dark:text-cyan-100",
  return_dp_out_for_pickup:
    "bg-sky-100 text-sky-800 ring-1 ring-inset ring-sky-600/30 dark:bg-sky-500/25 dark:text-sky-100",
  return_initiated:
    "bg-blue-100 text-blue-800 ring-1 ring-inset ring-blue-600/30 dark:bg-blue-500/25 dark:text-blue-100",
  return_not_accepted:
    "bg-indigo-100 text-indigo-800 ring-1 ring-inset ring-indigo-600/30 dark:bg-indigo-500/25 dark:text-indigo-100",
  return_pickup_failed:
    "bg-violet-100 text-violet-800 ring-1 ring-inset ring-violet-600/30 dark:bg-violet-500/25 dark:text-violet-100",
  return_rejected:
    "bg-purple-100 text-purple-800 ring-1 ring-inset ring-purple-600/30 dark:bg-purple-500/25 dark:text-purple-100",
  return_rejected_by_dp:
    "bg-fuchsia-100 text-fuchsia-800 ring-1 ring-inset ring-fuchsia-600/30 dark:bg-fuchsia-500/25 dark:text-fuchsia-100",
  return_rejected_by_store:
    "bg-pink-100 text-pink-800 ring-1 ring-inset ring-pink-600/30 dark:bg-pink-500/25 dark:text-pink-100",
  return_request_cancelled:
    "bg-rose-100 text-rose-800 ring-1 ring-inset ring-rose-600/30 dark:bg-rose-500/25 dark:text-rose-100",
  return_request_initiated:
    "bg-red-100 text-red-800 ring-1 ring-inset ring-red-600/30 dark:bg-red-500/25 dark:text-red-100",
  return_to_origin:
    "bg-orange-100 text-orange-800 ring-1 ring-inset ring-orange-600/30 dark:bg-orange-500/25 dark:text-orange-100",
  rto_bag_accepted:
    "bg-amber-100 text-amber-800 ring-1 ring-inset ring-amber-600/30 dark:bg-amber-500/25 dark:text-amber-100",
  rto_bag_delivered:
    "bg-yellow-100 text-yellow-800 ring-1 ring-inset ring-yellow-600/30 dark:bg-yellow-500/25 dark:text-yellow-100",
  rto_bag_out_for_delivery:
    "bg-green-100 text-green-800 ring-1 ring-inset ring-green-600/30 dark:bg-green-500/25 dark:text-green-100",
  rto_delivery_attempt_failed:
    "bg-lime-50 text-lime-900 ring-1 ring-inset ring-lime-400/30 dark:bg-lime-500/20 dark:text-lime-200",
  rto_in_transit:
    "bg-emerald-50 text-emerald-900 ring-1 ring-inset ring-emerald-400/30 dark:bg-emerald-500/20 dark:text-emerald-200",
  rto_initiated:
    "bg-teal-50 text-teal-900 ring-1 ring-inset ring-teal-400/30 dark:bg-teal-500/20 dark:text-teal-200",
  packed:
    "bg-sky-50 text-sky-800 ring-1 ring-inset ring-sky-400/40 dark:bg-sky-500/15 dark:text-sky-200",
  shipped:
    "bg-orange-50 text-orange-800 ring-1 ring-inset ring-orange-400/40 dark:bg-orange-500/15 dark:text-orange-200",
  delivered:
    "bg-emerald-50 text-emerald-800 ring-1 ring-inset ring-emerald-400/40 dark:bg-emerald-500/15 dark:text-emerald-200",
  cancelled:
    "bg-rose-50 text-rose-800 ring-1 ring-inset ring-rose-400/40 dark:bg-rose-500/15 dark:text-rose-200",
  returned:
    "bg-purple-50 text-purple-800 ring-1 ring-inset ring-purple-400/40 dark:bg-purple-500/15 dark:text-purple-200",
  default:
    "bg-gray-100 text-gray-700 ring-1 ring-inset ring-gray-500/20 dark:bg-white/10 dark:text-gray-200",
};

const formatOrderDate = (value) => {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

const normalizeOrders = (payload) => {
  if (!payload) return [];
  const list = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.data)
      ? payload.data
      : [payload];
  return list
    .map((order, index) => {
      if (!order) return null;
      const statusValue = (order.status || "").toString().toLowerCase();
      const statusText =
        order.operational_status || order.status || order?.bag_status || "";
      const skuImage =
        order?.bags?.[0]?.item?.image?.[0] ||
        order?.bags?.[0]?.item?.image ||
        "";
      return {
        id: order.id || order.order_id || `order-${index}`,
        shipmentId: order.shipment_id || order.shipmentId || "-",
        orderId:
          order?.affiliate_details?.affiliate_order_id ||
          order.order_id ||
          order.orderId ||
          "-",
        orderDate: formatOrderDate(
          order?.order?.created_time || order.order_date || order.orderDate,
        ),
        status: statusText ? String(statusText).toLowerCase() : "pending",
        statusLabel: statusText
          ? String(statusText).replace(/_/g, " ")
          : "Pending",
        paymentType: order.payment_mode || order.payment_type || "—",
        skuImage,
        skuName: order.sku_name || order.skuName || "SKU Item",
        skuCode: order.sku_code || order.skuCode || "",
        vertical: order.vertical || "General",
        assignedStore:
          order?.fulfilling_store?.code ||
          order.assigned_store ||
          order.assignedStore ||
          "—",
      };
    })
    .filter(Boolean);
};

const applyLocalFilters = (orders, filters) => {
  if (!filters) return orders;
  const shipmentQuery = filters.shipment?.trim().toLowerCase() || "";
  if (!shipmentQuery) return orders;
  return orders.filter((order) =>
    order.shipmentId.toLowerCase().includes(shipmentQuery),
  );
};

const API = {
  fetchOrders: async (params) => {
    try {
      const response = await apiClient.post(
        "/__deku/api/v1/__jiomart/fetch/shipment",
        params,
      );
      const payload =
        response?.data?.data ??
        response?.data?.orders ??
        response?.data ??
        [];
      return { data: payload, meta: { source: "api" } };
    } catch (error) {
      console.info(
        "[Orders] Falling back to sample data while API is wired.",
        error,
      );
      return { data: SAMPLE_ORDERS, meta: { source: "sample" } };
    }
  },
  fetchFyndStatus: async (shipmentId) => {
    try {
      const response = await apiClient.post(
        // "/__deku/api/v1/orders/fetch-fynd-status",
        {
          shipment_id: shipmentId,
        },
      );
      return response?.data ?? { status: "submitted" };
    } catch (error) {
      console.info(
        "[Orders] Placeholder Fynd status invoked for",
        shipmentId,
        error,
      );
      return { status: "synced" };
    }
  },
};

const Orders = () => {
  const { enqueueSnackbar } = useSnackbar();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const [searchShipment, setSearchShipment] = useState("");
  const [lastFilters, setLastFilters] = useState({});
  const [usingSampleData, setUsingSampleData] = useState(false);

  const loadOrders = useCallback(
    async (filters = {}) => {
      setLoading(true);
      try {
        const { data, meta } = await API.fetchOrders(filters);
        const normalized = normalizeOrders(data);
        const filtered = applyLocalFilters(normalized, filters);
        setOrders(filtered);
        setLastFilters(filters);
        setUsingSampleData(meta?.source === "sample");
      } catch (error) {
        const message =
          error?.response?.data?.message ||
          error?.message ||
          "Failed to fetch orders.";
        enqueueSnackbar(message, { variant: "error" });
      } finally {
        setLoading(false);
      }
    },
    [enqueueSnackbar],
  );

  useEffect(() => {
    loadOrders({});
  }, [loadOrders]);

  const handleSearch = useCallback(
    (event) => {
      event?.preventDefault();
      loadOrders({
        shipment: searchShipment,
      });
    },
    [loadOrders, searchShipment],
  );

  const handleFetchFyndStatus = useCallback(async () => {
    if (!searchShipment.trim()) {
      enqueueSnackbar("Enter a shipment ID to fetch Fynd status.", {
        variant: "info",
      });
      return;
    }
    setStatusLoading(true);
    try {
      const result = await API.fetchFyndStatus(searchShipment.trim());
      const statusLabel = result?.status
        ? String(result.status).replace(/_/g, " ")
        : "submitted";
      enqueueSnackbar(
        `Fynd status for ${searchShipment.trim()} is ${statusLabel}.`,
        { variant: "success" },
      );
      loadOrders(lastFilters);
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to fetch Fynd status.";
      enqueueSnackbar(message, { variant: "error" });
    } finally {
      setStatusLoading(false);
    }
  }, [enqueueSnackbar, lastFilters, loadOrders, searchShipment]);

  const tableRows = useMemo(() => {
    if (loading) {
      return Array.from({ length: 8 }).map((_, index) => (
        <tr key={`skeleton-${index}`} className="border-b border-gray-100">
          <td className="px-4 py-4">
            <Skeleton variant="rectangular" width={48} height={48} />
          </td>
          <td className="px-4 py-4">
            <Skeleton width={140} />
          </td>
          <td className="px-4 py-4">
            <Skeleton width={150} />
          </td>
          <td className="px-4 py-4">
            <Skeleton width={120} />
          </td>
          <td className="px-4 py-4">
            <Skeleton width={80} height={30} />
          </td>
          <td className="px-4 py-4">
            <Skeleton width={100} />
          </td>
          <td className="px-4 py-4">
            <Skeleton width={120} />
          </td>
          <td className="px-4 py-4">
            <Skeleton width={150} />
          </td>
        </tr>
      ));
    }

    if (!orders.length) {
      return (
        <tr>
          <td
            colSpan={8}
            className="px-4 py-12 text-center text-sm text-gray-500"
          >
            No orders match the current filters.
          </td>
        </tr>
      );
    }

    return orders.map((order) => {
      const pillClass = STATUS_TONES[order.status] || STATUS_TONES.default;
      const initials = order.skuName
        .split(" ")
        .map((word) => word.charAt(0))
        .join("")
        .slice(0, 2)
        .toUpperCase();
      return (
        <tr
          key={order.id}
          role="button"
          tabIndex={0}
          onClick={() => navigate(`/orders/${order.shipmentId}`)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              navigate(`/orders/${order.shipmentId}`);
            }
          }}
          className="cursor-pointer border-b border-gray-100 text-sm text-gray-700 transition last:border-b-0 focus-within:bg-gray-50 hover:bg-gray-50/80 dark:text-gray-200 dark:hover:bg-white/5"
        >
          <td className="px-4 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100 text-xs font-semibold text-gray-500 dark:bg-white/10 dark:text-gray-300">
                {order.skuImage ? (
                  <img
                    src={order.skuImage}
                    alt={order.skuName}
                    className="h-12 w-12 rounded-2xl object-cover"
                  />
                ) : (
                  initials
                )}
              </div>
            </div>
          </td>
          <td className="px-4 py-4 font-medium text-gray-900 dark:text-gray-100">
            {order.shipmentId}
          </td>
          <td className="px-4 py-4">{order.orderId}</td>
          <td className="px-4 py-4">{order.orderDate}</td>
          <td className="px-4 py-4">
            <span
              className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold capitalize shadow-[0_0_18px_rgba(0,0,0,0.12)] ${pillClass}`}
            >
              {order.statusLabel}
            </span>
          </td>
          <td className="px-4 py-4">{order.paymentType}</td>
          <td className="px-4 py-4">{order.vertical}</td>
          <td className="px-4 py-4">{order.assignedStore}</td>
        </tr>
      );
    });
  }, [loading, orders, navigate]);

  return (
    <PageLayout
      title="Orders"
      contentClassName="flex flex-1 flex-col gap-4 p-4 sm:gap-6 sm:p-6"
    >
      <div className="flex flex-col gap-6">
        <form
          onSubmit={handleSearch}
          className="flex flex-col gap-4 rounded-2xl bg-transparent"
        >
          <div className="w-full sm:max-w-sm sm:flex-1">
            <SearchBar
              value={searchShipment}
              onChange={(event) => setSearchShipment(event.target.value)}
              placeholder="Search Shipment ID"
            />
          </div>
        </form>

        <div className="flex flex-1 flex-col overflow-hidden rounded-md border border-gray-200 bg-white/90 shadow-sm dark:border-gray-800 dark:bg-[#0b0c0f]">
          <div className="flex-1 overflow-hidden">
            <div className="h-[72vh] overflow-y-auto">
              <table className="min-w-full divide-y divide-gray-100 text-left text-sm dark:divide-gray-800">
                <thead className="sticky top-0 z-10 bg-gray-50 text-xs font-semibold tracking-wide text-gray-500 uppercase dark:bg-[#141518] dark:text-gray-400">
                  <tr>
                    <th className="px-4 py-3 font-semibold">SKU</th>
                    <th className="px-4 py-3 font-semibold">Shipment ID</th>
                    <th className="px-4 py-3 font-semibold">Order ID</th>
                    <th className="px-4 py-3 font-semibold">Order Date</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Payment Type</th>
                    <th className="px-4 py-3 font-semibold">Vertical</th>
                    <th className="px-4 py-3 font-semibold">Store</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 bg-white dark:divide-gray-900 dark:bg-[#0b0c0f]">
                  {tableRows}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
};

export default Orders;
