import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

admin.initializeApp();

export const criarUsuario = onCall(async (request) => {
  const uidLogado = request.auth?.uid;

  if (!uidLogado) {
    throw new HttpsError("unauthenticated", "Usuário não autenticado.");
  }

  const data = request.data;

  const usuarioLogadoSnap = await admin
    .firestore()
    .collection("usuarios")
    .doc(uidLogado)
    .get();

  if (!usuarioLogadoSnap.exists) {
    throw new HttpsError("permission-denied", "Usuário logado não encontrado.");
  }

  const usuarioLogado = usuarioLogadoSnap.data();

  const podeCriar =
    usuarioLogado?.perfil === "admin" ||
    usuarioLogado?.acessos?.usuarios?.create === true;

  if (!podeCriar) {
    throw new HttpsError("permission-denied", "Sem permissão para criar usuários.");
  }

  if (
    usuarioLogado?.perfil !== "admin" &&
    ["admin", "regional", "secretario"].includes(data.perfil)
  ) {
    throw new HttpsError(
      "permission-denied",
      "Somente admin pode criar este perfil."
    );
  }

  const novoUsuario = await admin.auth().createUser({
    email: data.email,
    password: data.senha,
  });

  await admin.firestore().collection("usuarios").doc(novoUsuario.uid).set({
    uid: novoUsuario.uid,
    email: data.email,
    nome: data.nome,
    perfil: data.perfil,
    idSetor: data.idSetor || "",
    idComum: data.idComum || "",
    acessos: data.acessos,
  });

  return {
    uid: novoUsuario.uid,
  };
});
