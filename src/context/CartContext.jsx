/* eslint-disable react-refresh/only-export-components */
import PropTypes from "prop-types";
import { createContext, useContext, useEffect, useMemo, useReducer } from "react";

const CartContext = createContext(null);

const STORAGE_KEY = "artist-cart";

const cartReducer = (state, action) => {
  switch (action.type) {
    case "ADD_ITEM": {
      const normalizedId = String(action.payload.work.id ?? "");
      const normalizedWork = { ...action.payload.work, id: normalizedId };
      const existingItem = state.items.find((item) => item.work.id === normalizedId);

      if (existingItem) {
        return {
          ...state,
          items: state.items.map((item) =>
            item.work.id === normalizedId
              ? { ...item, quantity: item.quantity + action.payload.quantity }
              : item,
          ),
        };
      }

      return {
        ...state,
        items: [...state.items, { work: normalizedWork, quantity: action.payload.quantity }],
      };
    }
    case "REMOVE_ITEM": {
      return {
        ...state,
        items: state.items.filter((item) => item.work.id !== String(action.payload.id)),
      };
    }
    case "UPDATE_QUANTITY": {
      return {
        ...state,
        items: state.items
          .map((item) =>
            item.work.id === String(action.payload.id)
              ? { ...item, quantity: Math.max(0, action.payload.quantity) }
              : item,
          )
          .filter((item) => item.quantity > 0),
      };
    }
    case "CLEAR": {
      return { ...state, items: [], shippingQuote: null, pickupPoint: null };
    }
    case "SET_SHIPPING_QUOTE": {
      return {
        ...state,
        shippingQuote: action.payload ?? null,
        pickupPoint:
          action.payload && action.payload.type === "pickup"
            ? state.pickupPoint && state.pickupPoint.provider === action.payload.provider
              ? state.pickupPoint
              : null
            : null,
      };
    }
    case "SET_PICKUP_POINT": {
      return { ...state, pickupPoint: action.payload ?? null };
    }
    default:
      return state;
  }
};

function CartProvider({ children }) {
  const [state, dispatch] = useReducer(
    cartReducer,
    undefined,
    () => {
      if (typeof window === "undefined") {
        return { items: [], shippingQuote: null };
      }

      try {
        const stored = window.localStorage.getItem(STORAGE_KEY);
        if (!stored) {
          return { items: [], shippingQuote: null };
        }

        const parsed = JSON.parse(stored);
        return {
          items: Array.isArray(parsed?.items) ? parsed.items : [],
          shippingQuote: parsed?.shippingQuote ?? null,
          pickupPoint: parsed?.pickupPoint ?? null,
        };
      } catch (error) {
        console.warn("Failed to parse stored cart", error);
        return { items: [], shippingQuote: null, pickupPoint: null };
      }
    },
  );

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          items: state.items,
          shippingQuote: state.shippingQuote,
          pickupPoint: state.pickupPoint,
        }),
      );
    } catch (error) {
      console.warn("Failed to persist cart", error);
    }
  }, [state.items, state.shippingQuote, state.pickupPoint]);

  useEffect(() => {
    if (state.items.length === 0) {
      if (state.shippingQuote) {
        dispatch({ type: "SET_SHIPPING_QUOTE", payload: null });
      }
      if (state.pickupPoint) {
        dispatch({ type: "SET_PICKUP_POINT", payload: null });
      }
    }
  }, [state.items.length, state.shippingQuote, state.pickupPoint]);

  const addItem = (work, quantity = 1) => {
    dispatch({ type: "ADD_ITEM", payload: { work, quantity } });
  };

  const removeItem = (id) => {
    dispatch({ type: "REMOVE_ITEM", payload: { id: String(id) } });
  };

  const updateQuantity = (id, quantity) => {
    dispatch({ type: "UPDATE_QUANTITY", payload: { id: String(id), quantity } });
  };

  const clear = () => dispatch({ type: "CLEAR" });

  const setShippingQuote = (quote) => {
    dispatch({ type: "SET_SHIPPING_QUOTE", payload: quote });
  };

  const setPickupPoint = (point) => {
    dispatch({ type: "SET_PICKUP_POINT", payload: point });
  };

  const total = useMemo(
    () => state.items.reduce((sum, item) => sum + item.work.price * item.quantity, 0),
    [state.items],
  );

  const value = useMemo(
    () => ({
      items: state.items,
      addItem,
      removeItem,
      updateQuantity,
      clear,
      setShippingQuote,
      setPickupPoint,
      total,
      shippingQuote: state.shippingQuote,
      pickupPoint: state.pickupPoint,
    }),
    [state.items, state.shippingQuote, state.pickupPoint, total],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

CartProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

const useCart = () => {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }

  return context;
};

export { CartProvider, useCart };
