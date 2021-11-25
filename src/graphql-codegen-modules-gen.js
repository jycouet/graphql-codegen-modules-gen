import { readdirSync, writeFileSync, readFileSync, existsSync } from "fs";
import { join } from "path";

// const modulePath = "./packages/main/src/lib/modules";
const resolversFolder = "resolvers";
const typedefsFolder = "typedefs";
const genFolder = "_gen";

/* Start - Functions Helpers */
function getDirectories(source) {
  return readdirSync(source, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name);
}

function getFiles(source) {
  return readdirSync(source, { withFileTypes: true })
    .filter((dirent) => dirent.isFile())
    .map((dirent) => dirent.name);
}

function getFileWOTS(str) {
  return str.replace(".ts", "");
}

function getFileWODots(str) {
  return getFileWOTS(str).replace(".", "");
}
/* End   - Functions Helpers*/

export function gen(modulePath) {
  const isFolderExist = existsSync(modulePath);
  if (isFolderExist) {
    const moduleNames = getDirectories(modulePath);
    moduleNames.forEach((moduleName) => {
      /* resolvers.ts */
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

      writeFileSync(
        join(modulePath, moduleName, genFolder, "resolvers.ts"),
        dataResolvers.join("\r\n"),
        (err) => {
          console.error(err);
        }
      );
      console.log(
        " \x1b[32m",
        "✔",
        "\x1b[0m",
        `Merge resolvers [${moduleNames.length} modules]`
      );

      /* typedefs.ts */
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
    });

    console.log(
      " \x1b[32m",
      "✔",
      "\x1b[0m",
      `Merge typedefs  [${moduleNames.length} modules]`
    );
  } else {
    console.error(`❌ '${modulePath}' is not a valid folder path`);
  }
}