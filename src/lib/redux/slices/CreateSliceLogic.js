// this file is used to understand how createSlice works under the hood in Redux Toolkit
// it is not used in the application
// used to understand how RTK works and if there is need for custom implementation
//if juniour developer joins the project ,he can understand how RTK works using this file

// Our custom implementation of createSlice
function createSlice(config) {
  const { name, initialState, reducers } = config;

  // 1. Generate the action creators automatically based on the reducer keys
  const actions = {};

  // Loop through each key in the reducers object (e.g., 'increment', 'decrement')
  Object.keys(reducers).forEach((reducerKey) => {
    // Dynamically create an action creator function
    actions[reducerKey] = (payload) => {
      return {
        type: `${name}/${reducerKey}`,
        payload: payload,
      };
    };
  });

  // 2. Create the master slice reducer function
  const reducer = (state = initialState, action) => {
    // Find the specific updater key by stripping the prefix (e.g., 'counter/increment' -> 'increment')
    const actionKey = action.type.replace(`${name}/`, "");

    // Check if we have a matching updater in our reducers container
    if (reducers[actionKey]) {
      // Create a shallow copy to mimic state immutability
      const nextState = { ...state };

      // Execute the updater function, passing the state and the action
      reducers[actionKey](nextState, action);

      return nextState;
    }

    return state;
  };

  // Return the exact structure Redux Toolkit provides
  return {
    actions,
    reducer,
  };
}

// =================================================================
// INVOCATION (Using our custom function exactly like Redux Toolkit)
// =================================================================

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

// Destructuring exactly like you requested
const { increment, decrement } = counterSlice.actions;

// Testing the output:
console.log(increment()); // Output: { type: 'counter/increment', payload: undefined }

// Running the generated master reducer manually to see it update state:
let state = { value: 0 };

state = counterSlice.reducer(state, increment());
console.log(state); // Output: { value: 1 }

state = counterSlice.reducer(state, decrement());
console.log(state); // Output: { value: 0 }
