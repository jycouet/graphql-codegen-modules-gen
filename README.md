# Welcome to graphql-codegen-modules-gen 🔥

## 💡 Motivation

To use [Graphql-Modules](https://www.graphql-modules.com/) well, you need to organize your code by modules _(that's the all point 😉)_.

Something like:

```
...
├── modules
│   │
│   ├── user
│   │   └── graphql                        <-- client graphql operations
│   │   │   └── FRAG.user.gql
│   │   │   └── MUTATION.CreateUser.gql
│   │   │   └── QUERY.GetUser.gql
│   │   │   └── QUERY.GetUsers.gql
│   │   └── resolvers                      <-- server graphql resolvers
│   │   │   └── _Mutation.ts
│   │   │   └── _Query.ts
│   │   │   └── User.ts
│   │   └── typedefs                       <-- server graphql type definitions
│   │   │   └── _Mutation.graphql
│   │   │   └── _Query.graphql
│   │   │   └── TYPE.User.graphql
│   │   └── index.ts                       <-- server module creation / orchestration
│   │
│   ├── module2
│   │   └── graphql
│   │   │   └── ...
│   │   └── resolvers
│   │   │   └── ...
│   │   └── typedefs
│   │   │   └── ...
│   │   └── index.ts
│   │
│   ├── module3
│   │   └── ...
...
```

In `index.ts` of each module, you will bring all your resolvers and type definitions together. To do this, you can use [GraphQL Tools - Merging resolvers](https://www.graphql-tools.com/docs/schema-merging#merging-resolvers) and the merge will be done at runtime. Unfortunately, it will not work well with bundlers (check [this](https://github.com/ardatan/graphql-tools/issues/2808))

That's why `graphql-codegen-modules-gen` exist. The cli, will generate you `resolvers.ts` and `typedefs.ts` per module at build time. Then, you will compose your `index.ts` with these files.

## 🛠 Usage

### ▶ Install

```
yarn add graphql-codegen-modules-gen -D
```

### ▶ Add in your `package.json`

```
"gen-mg": "yarn graphql-codegen-modules-gen ./src/lib/modules",
```

_replacing `./src/lib/modules` by the location of your modules_

### ▶ Run it

```
yarn gen-mg
```

### ▶ (Bonus) Execute it after your usual @graphql-codegen

At the end of your `codegen.yml` file, add (carefull, like this, you don't see logs.):

```
hooks:
  afterAllFileWrite:
    - yarn gen-mg
```

or with a post hook.

## ✨ Result

In each module, a new folder named `_gen` with `resolvers.ts` and `typedefs.ts` containing everything needed for your `index.ts` file.

```
...
├── modules
│   │
│   ├── user
│   │   └── _gen                           <-- ✨ new folder (I put it in the .gitignore)
│   │   │   └── resolvers.ts               <-- ✨ new file, combine resolvers, export resolvers
│   │   │   └── typedefs.ts                <-- ✨ new file, merged typedefs, export typedefs
│   │   └── graphql
│   │   │   └── FRAG.user.gql
│   │   │   └── MUTATION.CreateUser.gql
│   │   │   └── QUERY.GetUser.gql
│   │   │   └── QUERY.GetUsers.gql
│   │   └── resolvers
│   │   │   └── _Mutation.ts
│   │   │   └── _Query.ts
│   │   │   └── User.ts
│   │   └── typedefs
│   │   │   └── _Mutation.graphql
│   │   │   └── _Query.graphql
│   │   │   └── TYPE.User.graphql
│   │   └── index.ts
│   │
│   ├── module2
│   │   └── graphql
│   │   │   └── ...
│   │   └── resolvers
│   │   │   └── ...
│   │   └── typedefs
│   │   │   └── ...
│   │   └── index.ts
│   │
│   ├── module3
│   │   └── ...
...
```

And here is how my `index.ts` file looks like:

```
import { createModule } from 'graphql-modules';
import { resolvers } from './_gen/resolvers';
import { typeDefs } from './_gen/typedefs';

export const userModule = createModule({
	id: 'user-module',
	typeDefs,
	resolvers,
	providers: [],
	middlewares: {
		'*': {
			'*': []
		}
	}
});

```

Now, enjoy! 🔥

# In Addition

**Merge 1/** Generate your `resolvers.ts` and `typedefs.ts` files per module

**Merge 2/** Generate global `_ctxModules.ts` (merge all `_ctxXXX.ts` of each modules)

**Merge 3/** Generate global `_appModules.ts` (merge all `index.ts` of each modules)
