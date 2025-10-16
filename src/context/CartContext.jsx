/* eslint-disable react-refresh/only-export-components */
import PropTypes from "prop-types";
import { createContext, useContext, useMemo, useReducer } from "react";

const CartContext = createContext(null);

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
      return { ...state, items: [] };
    }
    default:
      return state;
  }
};

function CartProvider({ children }) {
  const [state, dispatch] = useReducer(cartReducer, { items: [] });

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
      total,
    }),
    [state.items, total],
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
