import { ParsedUrlQuery } from "querystring";
import Head from 'next/head';
import { useRouter } from 'next/router'
import { NextApiRequest, NextApiResponse } from "next";
import nextSession from "next-session";
import { IronSessionOptions } from 'iron-session';
export const getSession = nextSession({});


import { withIronSessionApiRoute } from "iron-session/next";

export const ironOptions: IronSessionOptions = {
  cookieName: "myapp_cookiename",
  password: "complex_password_at_least_32_characters_long",
  // secure: true should be used in production (HTTPS) but can't be used in development (HTTP)
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
  },
};

export default withIronSessionApiRoute(loginRoute, ironOptions);

async function loginRoute(req: NextApiRequest, res: NextApiResponse) {
  // Save session auth "code" and "scope" in "auth" object.
  req.session.auth = {
    ...req.query
  };

  // Save the session
  await req.session.save();

  // Send a response.
  console.log('Saved req.session');
  res.send({ ok: true, auth: req.session.auth });
  // return <div>ok</div>;
}

// export default async function PageOAuth2Callback(async (req, res) => {
//   res.send('hi');
// });
//   const router = useRouter()

//   saveOAuthQuery(router.query);

//   return (
//     <Layout>
//       <Head key="head">
//         <title>{siteTitle}</title>
//       </Head>
//       Callback!
//       <script>
//         console.log('good');
//       </script>
//     </Layout>
//   );
// }

// The callback parameters from oauth.
interface OAuthCallbackQuery {
  code: string;
  scope: string;
}

/**
 * Save the OAuth data from the callback URL query.
 * @param query 
 */
function saveOAuthQuery(query: ParsedUrlQuery) {
  const oauthQuery: OAuthCallbackQuery = query as unknown as OAuthCallbackQuery;
  console.log(oauthQuery);
}