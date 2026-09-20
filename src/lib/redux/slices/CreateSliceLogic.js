// ============================================================================
// createSlice — a teaching-grade, from-scratch implementation in plain JS
// ============================================================================
// GOAL
//   This file reconstructs the *behaviour and API shape* of Redux Toolkit's
//   `createSlice` using hand-written JS, so a junior developer can read the
//   mechanism instead of trusting it as a black box.
//
// NOTE ON ACCURACY (read this first)
//   - This is a deliberately simplified "mental model", NOT the real source.
//   - The one thing that really matters in RTK is Immer: reducers receive a
//     Proxy "draft" of the state, can write to it like a plain mutable object
//     (including NESTED writes), and Immer then produces a brand-new immutable
//     state by diffing the draft against the original.
//   - That proxy behaviour is re-implemented below as a small `produce()` so
//     this demo behaves correctly for nested state too.
//   - Real RTK also ships things intentionally omitted here for brevity:
//     `prepare` callbacks, `selectors`, `createAsyncThunk`, extra patch-based
//     operations, memoization, devtools wiring, and more.
//   - This file is NOT used by the application — it only runs when executed
//     directly (node / tsx) for learning purposes.
// ============================================================================

// ============================================================================
// PART 1 — mini-Immer: a working Proxy-based `produce(base, recipe)`
// ============================================================================
// RTK's reducer functions are wrapped in Immer's `produce`. The recipe is
// allowed to "mutate" state directly; produce returns a NEW immutable state
// holding exactly the changes the recipe made.
// ============================================================================

const isDraftable = (value) => value !== null && typeof value === "object";

const markModified = (node) => {
  while (node) {
    node.modified = true;
    node = node.parent;
  }
};

// Recursively build the final object from a draft, reusing unchanged parts.
// Ancestors of a modified nested value get their shallow copy created here
// (exactly like Immer does when it "finalizes" a draft tree).
const finalize = (node) => {
  if (!node.modified) return node.base;
  let result = node.copy;
  if (result === undefined) {
    result = Array.isArray(node.base) ? [...node.base] : { ...node.base };
  }
  for (const [key, child] of node.children) {
    result[key] = finalize(child);
  }
  return result;
};

// A `draft` is a Proxy that lazily copies-on-first-write at every level.
// Reading through it returns nested drafts; writing marks the whole chain up
// to the root as "modified" and only then materialises a shallow copy.
const createDraftNode = (base, parent = null) => {
  const node = {
    base,
    copy: undefined,
    children: new Map(),
    parent,
    modified: false,
  };

  const draft = new Proxy(node, {
    get(_unused, key) {
      const current = node.copy ?? node.base;
      const value = current[key];
      if (isDraftable(value) && !node.children.has(key)) {
        // children stores bare NODES; the nested draft is reachable as node.draft
        node.children.set(key, createDraftNode(value, node));
      }
      const child = node.children.get(key);
      return child ? child.draft : value;
    },
    set(_unused, key, value) {
      markModified(node);
      if (node.copy === undefined) {
        node.copy = Array.isArray(node.base)
          ? [...node.base]
          : { ...node.base };
      }
      node.copy[key] = value;
      node.children.delete(key);
      return true;
    },
  });

  node.draft = draft;
  return node;
};

const produce = (base, recipe) => {
  const node = createDraftNode(base);
  // A recipe may EITHER mutate the draft OR return a brand-new value.
  // A returned value wins (used by case reducers that "replace" state).
  const replaced = recipe(node.draft);
  return replaced !== undefined ? replaced : finalize(node);
};

// ============================================================================
// PART 2 — mini-createSlice
// ============================================================================
// When you call createSlice({ name, initialState, reducers }) RTK:
//   1. creates one action creator per reducer key, typed "<name>/<key>",
//   2. wires every created action into a single reducer function that applies
//      the matching case-reducer through Immer,
//   3. returns { name, reducerPath, actions, reducer }.
// The pieces below mirror that contract.
// ============================================================================

function createSlice(config) {
  const { name, initialState, reducers = {} } = config;

  // 1. Build action creators, each carrying `.type` and `.match`, like RTK's.
  const actions = {};
  //fillter out reducers keys
  const reducerKeys = Object.keys(reducers);

  reducerKeys.forEach((reducerKey) => {
    const type = `${name}/${reducerKey}`;
    const creator = (payload) => ({ type, payload });
    creator.type = type;
    creator.match = (action) => action?.type === type;
    actions[reducerKey] = creator;
  });

  // 2. Support extraReducers (actions from OUTSIDE this slice, e.g. other
  //    slices or thunks) via the same builder-ish object RTK exposes.
  const extraCases = {};
  if (typeof config.extraReducers === "function") {
    config.extraReducers({
      addCase(type, caseReducer) {
        extraCases[type] = caseReducer;
      },
    });
  }

  // 3. The master reducer. It only reacts to its own actions (anchored
  //    prefix match, NOT a loose `type.includes(...)`), runs case reducers
  //    through produce(), and lets everything else pass through untouched.
  const reducer = (state = initialState, action) => {
    const type = action?.type;
    if (typeof type !== "string") return state;

    if (type.startsWith(`${name}/`)) {
      const key = type.slice(name.length + 1);
      if (reducers[key]) {
        return produce(state, (draft) => reducers[key](draft, action));
      }
    }

    if (extraCases[type]) {
      return produce(state, (draft) => extraCases[type](draft, action));
    }

    return state;
  };

  // RTK returns { name, reducerPath, actions, reducer } — reducerPath is a
  // plain alias for name unless you override it.
  return { name, reducerPath: config.reducerPath ?? name, actions, reducer };
}

// ============================================================================
// PART 3 — DEMO: using mini-createSlice exactly like Redux Toolkit
// ============================================================================

// --- Flat slice (the classic counter) ---------------------------------------
const counterSlice = createSlice({
  name: "counter",
  initialState: { value: 0 },
  reducers: {
    increment: (state) => {
      state.value += 1;
    },
    decrement: (state) => {
      state.value -= 1;
    },
  },
});

// Destructure action creators like you would in RTK.
const { increment, decrement } = counterSlice.actions;

console.log("createAction():", increment()); // { type: 'counter/increment', payload: undefined }
console.log("match():", increment.match(increment())); // true
console.log("match():", increment.match(decrement())); // false

let counterState = { value: 0 };
counterState = counterSlice.reducer(counterState, increment());
counterState = counterSlice.reducer(counterState, increment());
counterState = counterSlice.reducer(counterState, decrement());
console.log("counter state:", counterState); // { value: 1 }

// Unknown / foreign actions pass through unchanged — anchored matching means
// a foreign "other/counter/increment" does NOT trigger our case reducers.
counterState = counterSlice.reducer(counterState, {
  type: "other/counter/increment",
});
console.log("foreign action ignored:", counterState.value); // 1

// --- Nested slice + immutability proof --------------------------------------
// Redux Toolkit's mutation-style API has to be safe for DEEP state. Here a
// tiny Immer stands in for the real one, so nested writes stay immutable.
const userSlice = createSlice({
  name: "user",
  initialState: {
    profile: { name: "Abebe", address: { city: "Addis Ababa" } },
  },
  reducers: {
    rename: (state, action) => {
      state.profile.name = action.payload;
    },
    setCity: (state, action) => {
      state.profile.address.city = action.payload;
    },
  },
  extraReducers: (builder) =>
    builder.addCase("user/reset", () => ({
      profile: { name: "", address: { city: "" } },
    })),
});

const initialUser = {
  profile: { name: "Abebe", address: { city: "Addis Ababa" } },
};
const renamed = userSlice.reducer(
  initialUser,
  userSlice.actions.rename("Selam"),
);
const relocated = userSlice.reducer(
  renamed,
  userSlice.actions.setCity("Bahir Dar"),
);

console.log("nested write:", relocated.profile.address.city); // Bahir Dar
console.log("previous state preserved:", renamed.profile.address.city); // Addis Ababa
console.log("original untouched:", JSON.stringify(initialUser)); // profile still Abebe / Addis Ababa

const resetState = userSlice.reducer(relocated, { type: "user/reset" });
console.log("extraReducers reset:", resetState); // empty profile

// --- Run it: node src/lib/redux/slices/CreateSliceLogic.js --------------------
