import {
  readdirSync,
  writeFileSync,
  readFileSync,
  existsSync,
  mkdirSync,
} from "fs";
import { join } from "path";
import { exit } from "process";

// const modulePath = "./packages/main/src/lib/modules";
const resolversFolder = "resolvers";
const typedefsFolder = "typedefs";
const providersFolder = "providers";
const genFolder = "_gen";

/* Start - Functions Helpers */
function getDirectories(source) {
  return readdirSync(source, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name);
}

function getFiles(source) {
  if (existsSync(source)) {
    return readdirSync(source, { withFileTypes: true })
      .filter((dirent) => dirent.isFile())
      .map((dirent) => dirent.name);
  }
  return [];
}

function getFileWOTS(str) {
  return str.replace(".ts", "");
}

function getFileWODots(str) {
  return getFileWOTS(str).replace(".", "");
}

function getGreen(str) {
  return "\x1b[32m" + str + "\x1b[0m";
}

function pad(num, size) {
  var s = "000000000" + num;
  return s.substr(s.length - size);
}

function createFolderIfNotExists(folder) {
  if (!existsSync(folder)) {
    mkdirSync(folder);
  }
}

/**
 * toPascalCase
 * @param {String} input
 * @returns A string that has been converted into Pascal Case for keeping with the React Naming convention required for naming Components.
 * @see https://stackoverflow.com/a/53952925/13301381
 * @author kalicki2K
 */
function toPascalCase(input) {
  return `${input}`
    .replace(new RegExp(/[-_]+/, "g"), " ")
    .replace(new RegExp(/[^\w\s]/, "g"), "")
    .replace(
      new RegExp(/\s+(.)(\w+)/, "g"),
      ($1, $2, $3) => `${$2.toUpperCase() + $3.toLowerCase()}`
    )
    .replace(new RegExp(/\s/, "g"), "")
    .replace(new RegExp(/\w/), (s) => s.toUpperCase());
}

function getPrismaEnum(prismaFile) {
  let lines = prismaFile.split("\n");

  let enums = {};

  let currentEnum = "";
  lines.forEach((line) => {
    if (currentEnum !== "") {
      if (line.includes("}")) {
        currentEnum = "";
      } else {
        enums[currentEnum].push(line.trim());
      }
    }
    if (line.startsWith("enum")) {
      const [enumKey, enumName] = line.split(" ");
      currentEnum = toPascalCase(enumName);
      enums[currentEnum] = [];
    }
    // console.log(`line`, line);
  });

  return enums;
}
/* End   - Functions Helpers*/

export function gen(modulePath) {
  const isFolderExist = existsSync(modulePath);
  if (isFolderExist) {
    /***************** */
    /* 0/ Enum module  */
    /***************** */
    let prismaFile = readFileSync(
      join(modulePath, "../../../prisma/schema.prisma"),
      "utf-8"
    );
    let enums = getPrismaEnum(prismaFile);

    createFolderIfNotExists(join(modulePath, "_enums"));
    createFolderIfNotExists(join(modulePath, "_enums", "typedefs"));
    for (const key in enums) {
      const list = enums[key];
      let enumFileData = `enum ${key} {
\t${list.join("\n\t")}
}
`;
      writeFileSync(
        join(modulePath, "_enums", "typedefs", `ENUM.${key}.graphql`),
        enumFileData
      );
    }

    createFolderIfNotExists(join(modulePath, "_enums", "ui"));
    createFolderIfNotExists(join(modulePath, "_enums", "ui", "lists"));

    for (const key in enums) {
      const list = enums[key];
      let enumFileData = `import { ${key} } from '$graphql/_gen/clientTypes';

export function getList${key}() {
\tlet items: { key: ${key}; value: string }[] = [];

\t${list
        .map((c) => {
          return `items.push({ key: ${key}.${toPascalCase(
            c.toLowerCase()
          )}, value: '${toPascalCase(c.toLowerCase())}' });`;
        })
        .join("\n\t")}

\treturn items;
}
`;
      // Write this file only if it doesn't exist!
      // Like this, you can change the value with text that will be displayed in the UI!
      // TODO:
      // - List or obj?!
      // - Internationalisation?! (https://github.com/sveltejs/kit/issues/553)
      if (
        !existsSync(join(modulePath, "_enums", "ui", "lists", `List${key}.ts`))
      ) {
        writeFileSync(
          join(modulePath, "_enums", "ui", "lists", `List${key}.ts`),
          enumFileData
        );
      }
    }

    writeFileSync(
      join(modulePath, "_enums", `index.ts`),
      `import { createModule } from 'graphql-modules';
import { typeDefs } from './_gen/typedefs';

export const _enumsModule = createModule({
	id: 'enums-module',
	typeDefs
});
`
    );

    const enumsKeys = Object.keys(enums).map((key) => {
      return key;
    });
    console.log(
      `  ${getGreen("✔")} Enums 0/ `,
      `${getGreen(pad(enumsKeys.length, 2))} Enums created`,
      `for [${enumsKeys.map((c) => getGreen(c)).join(",")}]`
    );

    let ctxModules = [];
    let urqlCacheModules = [];
    const moduleNames = getDirectories(modulePath);
    moduleNames.forEach((moduleName) => {
      /***************** */
      /* 1/ resolvers.ts */
      /***************** */
      // import { resolvers as _Mutation } from '../resolvers/_Mutation';
      // import { resolvers as _Query } from '../resolvers/_Query';

      // export const resolvers = [_Mutation, _Query];
      const resolversFiles = getFiles(
        join(modulePath, moduleName, resolversFolder)
      );

      let dataResolvers = [];
      resolversFiles.forEach((resolver) => {
        dataResolvers.push(
          `import { resolvers as ${getFileWODots(
            resolver
          )} } from '../resolvers/${getFileWOTS(resolver)}';`
        );
      });
      dataResolvers.push(``);
      dataResolvers.push(`export const resolvers = [`);
      resolversFiles.forEach((resolver) => {
        dataResolvers.push(`  ${getFileWODots(resolver)},`);
      });
      dataResolvers.push(`];`);

      if (!existsSync(join(modulePath, moduleName, genFolder))) {
        mkdirSync(join(modulePath, moduleName, genFolder));
      }

      writeFileSync(
        join(modulePath, moduleName, genFolder, "resolvers.ts"),
        dataResolvers.join("\r\n"),
        (err) => {
          console.error(err);
        }
      );

      /***************** */
      /* 2/ typedefs.ts  */
      /***************** */
      // import { gql } from 'graphql-modules';

      // export const typeDefs = gql`
      //   type Mutation {
      //     createUser(name: String!): User
      //   }
      //   type Query {
      //     user(id: String!): User
      //     users: [User!]!
      //   }
      //   type User {
      //     id: String
      //     name: String
      //   }
      // `;
      const typedefsFiles = getFiles(
        join(modulePath, moduleName, typedefsFolder)
      );

      let dataTypedefs = [];

      dataTypedefs.push(`import { gql } from 'graphql-modules'`);
      dataTypedefs.push(``);
      dataTypedefs.push(`export const typeDefs = gql${"`"}`);

      typedefsFiles.forEach((typedefs) => {
        dataTypedefs.push(
          readFileSync(
            join(modulePath, moduleName, typedefsFolder, typedefs),
            "utf8"
          )
        );
      });

      dataTypedefs.push(`${"`"};`);

      writeFileSync(
        join(modulePath, moduleName, genFolder, "typedefs.ts"),
        dataTypedefs.join("\r\n"),
        (err) => {
          console.error(err);
        }
      );

      console.log(
        `  ${getGreen("✔")} Merge 1/ `,
        `${getGreen(pad(typedefsFiles.length, 2))} Typedefs`,
        `|`,
        `${getGreen(pad(resolversFiles.length, 2))} Resolvers`,
        `for [${getGreen(moduleName)}]`
      );

      /******************* */
      /* 3.1/ ctxModules   */
      /******************* */
      // Are there files starting by _ctx? file to add in the global ctxModules.ts file?
      const providersFiles = getFiles(
        join(modulePath, moduleName, providersFolder)
      );
      providersFiles.forEach((providerFile) => {
        if (providerFile.startsWith("_ctx")) {
          const ctxName = providerFile.replace("_ctx", "").replace(".ts", "");
          ctxModules.push({ moduleName, ctxName });
        }
      });

      /******************* */
      /* 5.1/ ctxModules   */
      /******************* */
      // Are there files starting by _urqlCache? file to add in the global _urqlCacheModules.ts file?
      providersFiles.forEach((providerFile) => {
        if (providerFile.startsWith("_urqlCache")) {
          const urqlCacheName = providerFile
            .replace("_urqlCache", "")
            .replace(".ts", "");
          urqlCacheModules.push({ moduleName, urqlCacheName });
        }
      });
    });

    /******************* */
    /* 3.2/ _ctxModules   */
    /******************* */
    let dataCtxModules = [];

    ctxModules.forEach((ctx) => {
      dataCtxModules.push(
        `import { getCtx${toPascalCase(ctx.ctxName)} } from '../../modules/${
          ctx.moduleName
        }/providers/_ctx${toPascalCase(ctx.ctxName)}';`
      );
    });

    dataCtxModules.push(``);
    dataCtxModules.push(`export function getCtxModules(prisma: any) {`);
    dataCtxModules.push(`	return {`);
    ctxModules.forEach((ctx) => {
      dataCtxModules.push(`		...getCtx${toPascalCase(ctx.ctxName)}(prisma),`);
    });
    dataCtxModules.push(`	};`);
    dataCtxModules.push(`}`);

    createFolderIfNotExists(join(modulePath, "../graphql", genFolder));

    writeFileSync(
      join(modulePath, "../graphql", genFolder, "_ctxModules.ts"),
      dataCtxModules.join("\r\n"),
      (err) => {
        console.error(err);
      }
    );

    console.log(
      `  ${getGreen("✔")} Merge 2/  ${getGreen(
        pad(ctxModules.length, 2)
      )} contexts  in ${getGreen("_gen/_ctxModules.ts")}       for`,
      `[${ctxModules
        .map((c) => getGreen(c.moduleName + "#" + c.ctxName))
        .join(",")}]`
    );

    /******************* */
    /* 4.0/ _appModules   */
    /******************* */
    let dataAppModules = [];
    moduleNames.forEach((moduleName) => {
      dataAppModules.push(
        `import { ${moduleName}Module } from '$modules/${moduleName}';`
      );
    });
    dataAppModules.push(``);
    dataAppModules.push(`export const modules = [`);
    moduleNames.forEach((moduleName) => {
      dataAppModules.push(`  ${moduleName}Module,`);
    });
    dataAppModules.push(`];`);

    writeFileSync(
      join(modulePath, "../graphql", genFolder, "_appModules.ts"),
      dataAppModules.join("\r\n"),
      (err) => {
        console.error(err);
      }
    );

    console.log(
      `  ${getGreen("✔")} Merge 3/  ${getGreen(
        pad(moduleNames.length, 2)
      )} modules   in ${getGreen("_gen/_appModules.ts")}       for`,
      `[${moduleNames.map((c) => getGreen(c)).join(",")}]`
    );

    /******************* */
    /* 5.2/ _urqlCacheModules   */
    /******************* */
    let dataUrqlCacheModules = [];

    urqlCacheModules.forEach((urqlCache) => {
      dataUrqlCacheModules.push(
        `import { urqlCache${toPascalCase(
          urqlCache.urqlCacheName
        )} } from '$modules/${
          urqlCache.moduleName
        }/providers/_urqlCache${toPascalCase(urqlCache.urqlCacheName)}';`
      );
    });

    dataUrqlCacheModules.push(``);
    dataUrqlCacheModules.push(`export const urqlCacheModules = {`);
    urqlCacheModules.forEach((urqlCache) => {
      dataUrqlCacheModules.push(
        `  ...urqlCache${toPascalCase(urqlCache.urqlCacheName)},`
      );
    });
    dataUrqlCacheModules.push(`}`);

    createFolderIfNotExists(join(modulePath, "../graphql", genFolder));

    writeFileSync(
      join(modulePath, "../graphql", genFolder, "_urqlCacheModules.ts"),
      dataUrqlCacheModules.join("\r\n"),
      (err) => {
        console.error(err);
      }
    );

    console.log(
      `  ${getGreen("✔")} Merge 5/  ${getGreen(
        pad(urqlCacheModules.length, 2)
      )} urqlCache in ${getGreen("_gen/_urqlCacheModules.ts")} for`,
      `[${urqlCacheModules
        .map((c) => getGreen(c.moduleName + "#" + c.urqlCacheName))
        .join(",")}]`
    );
  } else {
    console.error(`❌ '${modulePath}' is not a valid folder path`);
  }
}
