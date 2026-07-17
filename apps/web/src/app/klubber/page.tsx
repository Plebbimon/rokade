import Link from "next/link";
import { redirect } from "next/navigation";
import {
  clubAuditTrail,
  clubMembers,
  userClubs,
  type AuditEntry,
  type ClubMember,
  type ClubWithRole,
} from "@rokade/db";
import { AuditTable } from "@/components/audit-trail";
import { requireUser } from "@/lib/auth";
import { addMemberAction, createClubAction } from "@/lib/club-actions";
import { ROLE_LABEL } from "@/lib/format";
import { db, isMultiUser } from "@/lib/store";

export const dynamic = "force-dynamic";

function MemberList({
  club,
  members,
  trail,
}: {
  club: ClubWithRole;
  members: ClubMember[];
  trail: AuditEntry[];
}) {
  return (
    <section>
      <h2>
        {club.name} <span className="muted">({ROLE_LABEL[club.role]})</span>
      </h2>
      <ul className="plain">
        {members.map((m) => (
          <li key={m.userId}>
            {m.email} <span className="muted">{ROLE_LABEL[m.role]}</span>
          </li>
        ))}
      </ul>
      {club.role === "admin" ? (
        <form action={addMemberAction} className="row">
          <input type="hidden" name="clubId" value={club.id} />
          <input name="email" type="email" required placeholder="ny@medlem.no" />
          <select name="role" defaultValue="arbiter">
            <option value="arbiter">Turneringsleder</option>
            <option value="admin">Administrator</option>
          </select>
          <button type="submit">Legg til medlem</button>
        </form>
      ) : null}
      {trail.length > 0 && (
        <>
          <h3>Logg</h3>
          <AuditTable entries={trail} />
        </>
      )}
    </section>
  );
}

export default async function ClubsPage() {
  if (!isMultiUser()) redirect("/turneringer");
  const user = (await requireUser())!;
  const clubs = await userClubs(db(), user.id);
  const members = await Promise.all(clubs.map((club) => clubMembers(db(), club.id)));
  const trails = await Promise.all(clubs.map((club) => clubAuditTrail(db(), club.id)));

  return (
    <main>
      <p>
        <Link href="/turneringer">← Mine turneringer</Link>
      </p>
      <h1>Klubber</h1>

      {clubs.length === 0 ? (
        <p className="lead">
          Du er ikke medlem i noen klubb ennå. Opprett klubben din nedenfor, eller be klubbens
          administrator legge deg til med e-postadressen din.
        </p>
      ) : (
        clubs.map((club, i) => (
          <MemberList key={club.id} club={club} members={members[i]!} trail={trails[i]!} />
        ))
      )}

      <h2>Ny klubb</h2>
      <p className="muted">Den som oppretter klubben blir dens første administrator.</p>
      <form action={createClubAction} className="stack">
        <label>
          Klubbnavn
          <input name="name" required placeholder="Bergens Schakklub" />
        </label>
        <button type="submit">Opprett klubb</button>
      </form>
    </main>
  );
}
